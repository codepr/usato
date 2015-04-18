usatoApp.config(function($routeProvider) {
	$routeProvider
		.when('/', {
			templateUrl: 'tmpl/home.html',
			controller: 'MainController'
		}).when('/book', {
			templateUrl: 'tmpl/book.html',
			controller: 'MainController'
		}).when('/addbook/:id', {
			templateUrl: 'tmpl/addbook.html',
			controller: 'addBookController'
		}).when('/customers', {
			templateUrl: 'tmpl/customers.html',
			controller: 'customersController'
		}).when('/addcustomer', {
			templateUrl: 'tmpl/addcustomer.html',
			controller: 'addCustomerController'
		}).when('/showcustomer/:id', {
			templateUrl: 'tmpl/showcustomer.html',
			controller: 'showCustomerController'
		}).when('/archive', {
			templateUrl: 'tmpl/archive.html',
			controller: 'archiveController'
		}).when('/addtoarchive', {
			templateUrl: 'tmpl/addtoarchive.html',
			controller: 'archiveController'
		}).otherwise({
			redirectTo: '/'
		});
});
