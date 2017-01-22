var dan = (function () {
    var RETRY_COUNT = 3;
    var RETRY_INTERVAL = 2000;
    var POLLING_INTERVAL = 100;
    var _pull;
    var _mac_addr = '';
    var _profile = {};
    var _registered = false;
    var _df_list;
    var _origin_df_list;
    var _df_selected = {};
    var _df_is_odf = {};
    var _df_timestamp = {};
    var _suspended = true;
    var _ctl_timestamp = '';

    //dai 最後會呼叫這個
    /*其中 callback 是會執行
        document.title = profile.d_name;
        ida.iot_app();
      目的是要傳遞 endpoint
    */
    function init (pull, endpoint, mac_addr, profile, callback) {
        console.log(pull);
        _pull = pull;
        _mac_addr = mac_addr;

        function init_callback (result) {
            if (result) {
                callback(csmapi.get_endpoint());
            } else {
                callback('');
            }
        }

        register(endpoint, profile, init_callback);
    }

    // 由dai 呼叫 dan-->init後 init再呼叫此函式
    function register (endpoint, profile, callback) {
        profile['d_name'] = (Math.floor(Math.random() * 99)).toString() + '.' + profile['dm_name'];
                 //profile['dm_name'] +'-'+ _mac_addr.slice(_mac_addr.length - 4);
        _profile = profile;
        csmapi.set_endpoint(endpoint);

        var retry_count = 0;
        function register_callback (result) {
            if (result) {
                if (!_registered) {
                    _registered = true;
                    _df_list = profile['df_list'].slice();
                    _origin_df_list = profile['origin_df_list'].slice();
                    for (var i = 0; i < _df_list.length; i++) {
                        console.log(profile.df_list[i]);
                        //_df_selected[_df_list[i]] = profile.df_list[i]; // turn true;
                         _df_selected[_df_list[i]] = false
                        // _df_is_odf[_df_list[i]] = true
                        _df_is_odf[_df_list[i]] = false; // all idf
                        _df_timestamp[_df_list[i]] = '';
                        _ctl_timestamp = '';
                        _suspended = true;
                    }
                    setTimeout(push_ctl, 0);

                    //setTimeout(push(profile.df_list[0], [154,247,60] , callback), 0);
                }
                callback(true);
            } else {
                if (retry_count < 2) {
                    retry_count += 1;
                    setTimeout(function () {
                        csmapi.register(_mac_addr, profile, register_callback);
                    }, RETRY_INTERVAL);
                } else {
                    callback(false);
                }
            }
        }

        csmapi.register(_mac_addr, profile, register_callback);
    }
    
    /*//////////////////////////////////////////////////////////////////
     *PULL~~~~~~~~~~~~
    //////////////////////////////////////////////////////////////////*/
    function pull_ctl () {
        if (!_registered) {
            return;
        }

        function pull_ctl_callback (dataset, error) {
            if (has_new_data(dataset, _ctl_timestamp)) {
                _ctl_timestamp = dataset[0][0];
                if (handle_command_message(dataset[0][1])) {
                    _pull('Control', dataset[0][1]);
                } else {
                    console.log('Problematic command message:', dataset[0][1]);
                }
            }

            pull_odf(0);
        }

        csmapi.pull(_mac_addr, '__Ctl_O__', pull_ctl_callback);
    }

    ///////////////////////////////////////////////////////////////////
    function pull_odf (index) {
        if (!_registered) {
            return;
        }

        if (_suspended || index >= _df_list.length) {
            setTimeout(pull_ctl, POLLING_INTERVAL);
            return;
        }

        var _df_name = _df_list[index];

        if (!_df_is_odf[_df_name] || !_df_selected[_df_name]) {
            pull_odf(index + 1);
            return;
        }

        function pull_odf_callback (dataset, error) {
            if (has_new_data(dataset, _df_timestamp[_df_list[index]])) {
                _df_timestamp[_df_list[index]] = dataset[0][0];
                _pull(_df_list[index], dataset[0][1]);
            }

            pull_odf(index + 1);
        }
        csmapi.pull(_mac_addr, _df_name, pull_odf_callback);
    }


   
    /*//////////////////////////////////////////////////////////////////
     *PUSH~~~~~~~~
    //////////////////////////////////////////////////////////////////*/
    function push_ctl () {

        if (!_registered) {
            return;
        }
        push_idf(0);

    }
    
    ///////////////////////////////////////////////////////////////////
    function push_idf (index) {

        if (!_registered) {
            return;
        }
        //console.log("hi0");

        if (index >= _df_list.length) {
            setTimeout(push_ctl, POLLING_INTERVAL);
            return;
        }

        var _df_name = _df_list[index];


        function push_idf_callback () {
            push_idf(index + 1);
        }
        console.log(_origin_df_list[index]());
        csmapi.push(_mac_addr, _df_name, _origin_df_list[index](), push_idf_callback);
    }
    ///////////////////////////////////////////////////////////////////

    function handle_command_message (data) {
        switch (data[0]) {
        case 'RESUME':
            _suspended = false;
            break;
        case 'SUSPEND':
            _suspended = true;
            break;
        case 'SET_DF_STATUS':
            flags = data[1]['cmd_params'][0]
            if (flags.length != _df_list.length) {
                console.log(flags, _df_list);
                return false;
            }

            for (var i = 0; i < _df_list.length; i++) {
                _df_selected[_df_list[i]] = (flags[i] == '1');
            }
            break;
        default:
            console.log('Unknown command:', data);
            return false;
        }
        return true;
    }

    function has_new_data (dataset, timestamp) {
        if (dataset.length == 0 || timestamp == dataset[0][0]) {
            return false;
        }
        return true;
    }

    //給 dai 的 pull(決定連上沒那個)呼叫的
    function push (idf_name, data, callback) {
        console.log("Test:", idf_name);
        if (idf_name == 'Control') {
            idf_name = '__Ctl_I__';
        }
        _df_is_odf[idf_name] = false;
        if (idf_name == '__Ctl_I__' || _df_selected[idf_name]) {
            csmapi.push(_mac_addr, idf_name, data, callback);
        }
    }
    //給 dai 的derigister呼叫的
    function deregister (callback) {
        _registered = false;
        csmapi.deregister(_mac_addr, callback);
    }

    return {
        'init': init,
        'register': register,
        'push': push,
        'deregister': deregister,
    };
})();