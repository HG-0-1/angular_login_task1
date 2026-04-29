//main
var mylogin = angular.module('mylogin', ["ngRoute"]);

mylogin.config(function($routeProvider, $httpProvider) {
    $routeProvider
        .when("/login", {
            templateUrl: "html_file/login.html",
            controller: "logincontroller"
        })
        .when("/dashboard", {
            templateUrl: "html_file/dashboard.html",
            controller: "dashboardcontroller"
        })
        .otherwise({ redirectTo: "/login" });
    
    $httpProvider.interceptors.push('authInterceptor');
});

mylogin.run(function($rootScope, $location, authservice) {
    $rootScope.$on("$routeChangeStart", function(event, next, prev) {
        var requestedPath = next.$$route ? next.$$route.originalPath : (next.originalPath || $location.path());
        if (requestedPath === "/dashboard" && !authservice.islogin()) {
            $location.path("/login");
        }
    });
});