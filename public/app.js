var app = angular.module('App', []);

app.controller('MainController', ['$scope', '$http', function ($scope, $http) {

    class user {
        constructor(name, pass) {
            this.name = name;
            this.pass = pass;
        }
    };

    $scope.userLog = new user(undefined, undefined);

    getUser = () => {
        $http.get('/uid')
            .then((response) => {
                console.log(response.data);
                $http.get('/getuserinfo')
                    .then((response) => {
                        $scope.userLog.name = response.data.username;
                        $scope.tempUser = (response.data.tempuser == 1 ? true : false);
                        $scope.deleteUserBool = false;
                        if (!$scope.generated) {
                            $scope.watchMessage = '';
                            $scope.caption = 'header';
                        }
                        $scope.getWatched();
                    });
            });
    };

    $scope.tempUser = true;

    getUser();

    $scope.random = () => {
        $http.get('/random')
            .then((response) => {
                $scope.generated = true;
                $scope.episode = response.data;
                $scope.watchMessage = 'Add to ';
                $scope.caption = '';
            });
    };

    $scope.watch = () => {
        if ($scope.generated) {
            $http.post('/watch/' + $scope.episode.id)
                .then((response) => {
                    console.log(response.data);
                    if (response.data) {
                        $scope.watchMessage = 'Remove from ';
                        $scope.caption = '';
                    } else {
                        $scope.watchMessage = 'Add to ';
                        $scope.caption = '';
                    }
                    $scope.getWatched();
                });
        }
    };

    $scope.clear = () => {
        var r = confirm('Are you sure you want to delete your watched history?');
        if (r) {
            $http.get('/clear')
                .then(() => {
                    $scope.watchMessage = 'Add to ';
                    $scope.caption = '';
                    $scope.getWatched();
                });
        }
    }

    $scope.deleteUser = () => {
        var r = confirm('Do you want to delete your account?\nYou won\'t be able to undo!');
        if (r) {
            $http.delete('/deluser')
                .then(() => {
                    $scope.userLog = new user(undefined, undefined);
                    $scope.generated = false;
                    getUser();
                })
        }
    };

    $scope.logout = () => {
        var r = confirm('Are you sure you want to logout?');
        if (r) {
            $http.get('/logout')
                .then(() => {
                    $scope.userLog = new user(undefined, undefined);
                    $scope.generated = false;
                    getUser();
                })
        }
    };

    $scope.hideIn = () => {
        $scope.showIn = false;
    };

    $scope.hideUp = () => {
        $scope.showUp = false;
    };

    $scope.showIn = false;
    $scope.showUp = false;

    $scope.userIn = new user(undefined, undefined);
    $scope.userUp = new user(undefined, undefined);

    //signup

    $scope.newUser = () => {
        if ($scope.userUp.name && $scope.userUp.pass) {
            $http.post('/newuser/' + $scope.userUp.name + '/' + $scope.userUp.pass)
                .then((response) => {
                    $scope.userUp = new user(undefined, undefined);
                    getUser();
                    $scope.invalidUser = false;
                    $scope.deleteUserBool = false;
                    $scope.showUp = false;
                }, (error) => {
                    $scope.invalidUser = true;
                });
        } else {
            $scope.invalidUser = true;
        }
    };

    //login

    $scope.getId = () => {
        console.log('Getting Id');
        $http.get('/uid/' + $scope.userIn.name + '/' + $scope.userIn.pass)
            .then((response) => {
                console.log('Welcome user: ' + response.data);
                $scope.userNotFound = false;
                $scope.getWatched();
                $scope.userLog = Object.assign({}, $scope.userIn);
                $scope.userIn = new user(undefined, undefined);
                $scope.tempUser = false;
                $scope.generated = false;
                $scope.watchMessage = '';
                $scope.caption = 'header';
                $scope.deleteUserBool = false;
                $scope.showIn = false;
            }, (error) => {
                console.log('User not found!');
                $scope.userNotFound = true;
            });
    };

    $scope.getWatched = () => {
        $http.get('/watched')
            .then((response) => {
                $scope.watchedArray = response.data;
                if ($scope.watchedArray.length === 0) {
                    $scope.watchedArray = undefined;
                }
            });
    }
}]);