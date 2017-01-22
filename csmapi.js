var csmapi = (function () {
    
    var ENDPOINT = window.location.origin;

    function set_endpoint (endpoint) {
        ENDPOINT = endpoint;
    }

    function get_endpoint () {
        return ENDPOINT;
    }

    function register (mac_addr, profile, callback) {
        $.ajax({
            type: 'POST',
            url: ENDPOINT +'/'+ mac_addr,
            data: JSON.stringify({'profile': profile}),
            contentType:"application/json; charset=utf-8",
        }).done(function (data) {
            if (callback) {
                console.log(data);
                callback(true);
            }
        }).fail(function () {
            if (callback) {
                callback(false);
            }
        });
    }

    function deregister (mac_addr, callback) {
        $.ajax({
            type: 'DELETE',
            url: ENDPOINT +'/'+ mac_addr,
            contentType:"application/json; charset=utf-8",
        }).done(function () {
            if (callback) {
                callback(true);
            }
        }).fail(function () {
            if (callback) {
                callback(false);
            }
        });
    }
  
    //dan 的 pull_ctl 會呼叫這函式
    function pull (mac_addr, odf_name, callback) {
        console.log("odf:", odf_name);
        $.ajax({
            type: 'GET',
            url: ENDPOINT +'/'+ mac_addr +'/'+ odf_name,
            contentType:"application/json; charset=utf-8",
        }).done(function (obj) {
            if (typeof obj === 'string') {
                obj = JSON.parse(obj);
            }

            if (callback) {
                callback(obj['samples']);
            }
        }).fail(function (error) {
            if (callback) {
                callback([], error);
            }
        });
    }

    function push (mac_addr, idf_name, data, callback) {
        console.log("idf:", idf_name);
        $.ajax({
            type: 'PUT',
            url: ENDPOINT +'/'+ mac_addr +'/'+ idf_name,
            data: JSON.stringify({'data': data}),
            contentType:"application/json; charset=utf-8",
        }).done(function (msg) {
            if (callback) {
                callback(true);
            console.log(msg);
            }
        }).fail(function (msg) {
            if (callback) {
                callback(false);
            console.log(msg);
            }
        });
    }

    return {
        'set_endpoint': set_endpoint,
        'get_endpoint': get_endpoint,
        'register': register,
        'deregister': deregister,
        'pull': pull,
        'push': push,
    };
})();