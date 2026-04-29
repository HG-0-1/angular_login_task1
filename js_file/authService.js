//authService
mylogin.service("authservice", function($http, $rootScope) {
    this.login = function(user) {
        let data = new URLSearchParams();
        data.append("username", user.username);
        data.append("password", user.password);
        data.append("grant_type", "password");
        data.append("client_id", "ACCULAB");
        data.append("client_secret", "acculab-secret");
        
        return $http({
            method: "POST",
            url: "https://test-acculab.azurewebsites.net/oauth/token",
            data: data.toString(),
            headers: { "Content-Type": "application/x-www-form-urlencoded"}
        });
    };

    this.savesession = function(data) {
        localStorage.setItem("token", data.access_token);
        localStorage.setItem("user", JSON.stringify(data.user));
        var timestamp = (data.user && data.user.login_timestamp) ? data.user.login_timestamp : Date.now();
        localStorage.setItem("loginTimestamp", timestamp);
        $rootScope.$broadcast("authChange");
    };

    this.gettoken = function() {
        return localStorage.getItem("token");
    };

    this.logout = function() {
        localStorage.removeItem("token");
        localStorage.removeItem("user");
        localStorage.removeItem("loginTimestamp");
        $rootScope.$broadcast("authChange");
    };

    this.islogin = function() {
        return !!localStorage.getItem("token");
    };
});

//authInterceptor
mylogin.factory('authInterceptor', function($injector) {
    return {
        request: function(config) {
            var authservice = $injector.get('authservice');
            var token = authservice.gettoken();
            if (token) {
                config.headers.Authorization = 'bearer ' + token;
            }
            return config;
        }
    };
});