//controller
mylogin.controller("logincontroller", function($scope, $location, authservice) {
    $scope.user = {};
    $scope.error = "";
    $scope.login = function() {
        authservice.login($scope.user)
            .then(function(response) {
                authservice.savesession(response.data);
                $location.path("/dashboard");
            }, function(error) {
                $scope.error = "Invalid username or password. Please try again";
                console.error("Login error:", error);
            });
    };
});

mylogin.controller("dashboardcontroller", function($scope, $location, authservice) {
    let userData = JSON.parse(localStorage.getItem("user"));
    $scope.username = userData && userData.username ? userData.username : "Guest";
    $scope.loginTimestamp = localStorage.getItem("loginTimestamp");
    $scope.logout = function() {
        authservice.logout();
        $location.path("/login");
    };
});


//directives
mylogin.directive("authOnly", function(authservice, $rootScope) {
    return {
        restrict: "A",
        link: function(scope, element) {
            var updateVisibility = function() {
                if (authservice.islogin()) {
                    element.css('display', '');  
                } else {
                    element.css('display', 'none');
                }
            };
            updateVisibility();
            var unbind = $rootScope.$on("authChange", updateVisibility);
            scope.$on("$destroy", unbind);
        }
    };
});
//filters
mylogin.filter("formatDate", function() {
    return function(input) {
        if (!input) return "";
        let date = new Date(parseInt(input));
        if (isNaN(date.getTime())) return "Invalid date";
        return date.toLocaleString();
    };
});