usatoApp.config(function($routeProvider) {
		$routeProvider
		.when('/', {
			templateUrl: 'tmpl/home.html',
			controller: 'usatoAppController'
		}).when('/book', {
			templateUrl: 'tmpl/book.html',
			controller: 'usatoAppController'
		}).when('/bookings', {
			templateUrl: 'tmpl/bookings.html',
			controller: 'bookingsController'
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
			controller: 'usatoAppController'
		}).otherwise({
			redirectTo: '/'
		});
});
