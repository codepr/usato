usatoApp.factory('usatoAppFactory', function($resource) {
	return $resource("./data/store.json");
});

usatoApp.factory('usatoAppBookingFactory', function($resource) {
	return $resource("./data/bookings.json");
});

usatoApp.factory('usatoAppCustomerFactory', function($resource) {
	return $resource("./data/customers.json");
});
