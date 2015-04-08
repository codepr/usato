var http = require('http'),
	fs = require('fs');
// Download html of a URL specified page
function download(url, callback) {
	http.get(url, function(res) {
		var data = "";
		res.on('data', function(chunk) {
			data += chunk;
		});
		res.on('end', function() {
			callback(data);
		});
	}).on('error', function() {
		callback(null);
	});
};
// Extract array of isbn from array of objects
function toArr(jobj) {
	var ret = [];
	for(var i = 0; i < jobj.length; i++) {
		ret.push(jobj[i].isbn);
	}
	return ret;
};

usatoApp.controller('usatoAppController', function($scope, usatoAppFactory, usatoAppCustomerFactory, $location) {
	$scope.headerSrc = './tmpl/header.html';
	$scope.books = usatoAppFactory.query();
	$scope.quantity = 10;
	$scope.customers = usatoAppCustomerFactory.query();
	$scope.currCustomer = null;

	$scope.isActive = function(route) {
		return route === $location.path();
	};

	$scope.back = function() {
		window.history.back();
	};

	$scope.getBookByIsbn = function(isbn) {
		var books = $scope.books;
		for(var i = 0; i < books.length; i++) {
			var book = $scope.books[i];
			if(book.ISBN == isbn) {
				$scope.currBook = book;
			} 
		}
	};
	
	$scope.getCustomerById = function(id) {
		var customers = $scope.customers;
		for(var i = 0; i < customers.length; i++) {
			var customer = $scope.customers[i];
			if(customer.id == id) {
				$scope.currCustomer = customer;
			}
		}
	};

	$scope.getReserved = function(isbns) {
		var arr = [];
		var books = $scope.books;
		for(var i = 0; i < isbns.length; i++) {
			for(var j = 0; j < books.length; j++) {
				var book = $scope.books[j];
				if(book.Isbn == isbns[i]) {
					arr.push(book);
				}
			}
		}
		$scope.reservedBooks = arr;
	};

	$scope.getSold = function(isbns) {
		var arr = [];
		var books = $scope.reservedBooks;
		for(var i = 0; i < isbns.length; i++) {
			for(var j = 0; j < books.length; j++) {
				var book = $scope.reservedBooks[j];
				if(book.Isbn == isbns[i]) {
					arr.push(book);
				}
			}
		}
		$scope.soldBooks = arr;
	};

	// process table inside specified url

	$scope.getTable = function() {
		var url = "http://www.giuseppeveronese.it/public/GV_290514_122817_1_CLAS.html";
		var cheerio = require('cheerio');
		download(url, function(data) {
			if(data) {
				// load html data downloaded
				var $ = cheerio.load(data);
				// get table snippet
				var col = $('table tr td').map(function() {
					return $(this).text();
				});
				// get only table data JSON-formatted
				var tbObj = $('table tr').map(function() {
					var row = {};
					$(this).find('td').each(function(i) {
						var rowName = col[i];
						row[rowName] = $(this).text();
					});
					return row;
				}).get();
				// remove spaces from keys (better compatibility with angular)
				for(var key in tbObj) {
					for(var k in tbObj[key]) {
						var newKey = k.trim();
						tbObj[key][newKey] = tbObj[key][k].trim();
						if(newKey !== k) {
							delete tbObj[key][k];
						}
					}
				}
				// remove first element (usually contains headers of the table scraped)
				tbObj.shift();
				// write to storage persistence file
				var ob = JSON.stringify(tbObj);
				fs.writeFileSync('./data/store.json', ob);
			}
			else alert("error");
		});
	};
});

usatoApp.controller('bookingsController', function($scope, usatoAppBookingFactory) {
	$scope.bookings = usatoAppBookingFactory.query();
	$scope.nameById = function(id) {
		var customers = $scope.customers;
		for(var i = 0; i < customers.length; i++) {
			var customer = $scope.customers[i];
			if(customer.id == id) {
				return $scope.customers[i].name;
			}
		}
	};
});
// maybe useless?
usatoApp.controller('customersController', function($scope, usatoAppCustomerFactory) {
	$scope.customers = usatoAppCustomerFactory.query();	
	// remove customer and save it persistencly
	$scope.deleteCustomer = function(id) {
		$scope.customers.splice(id,1);
		fs.writeFileSync('./data/customers.json', JSON.stringify($scope.customers));
	};
});

usatoApp.controller('showCustomerController', function($scope, $routeParams) {
	$scope.getCustomerById($routeParams.id);
	$scope.getReserved(toArr($scope.currCustomer.isbns));
	$scope.getSold($scope.currCustomer.sold);
	// get total cost of reserved books
	$scope.getTotal = function() {
		var total = 0;
		for(var i = 0; i < $scope.reservedBooks.length; i++) {
			total += parseFloat($scope.reservedBooks[i].Prezzo.replace(/,/, '.'));
		}
		return Math.round(total * 100) / 100;
	};
	// get total cost of sold books
	$scope.getTotalSold = function() {
		var total = 0;
		for(var i = 0; i < $scope.soldBooks.length; i++) {
			total += parseFloat($scope.soldBooks[i].Prezzo.replace(/,/, '.'));
		}
		return Math.round(total * 100) / 100;
	};
	// get copies for book by id
	$scope.getCopies = function(isbn) {
		for(var i = 0; i < $scope.currCustomer.isbns.length; i++) {
			if($scope.currCustomer.isbns[i].isbn == isbn)
				return $scope.currCustomer.isbns[i].copies;
		}
	};
});

usatoApp.controller('addBookController', function($scope, $routeParams) {
	$scope.getCustomerById($routeParams.id);
	$scope.getReserved(toArr($scope.currCustomer.isbns));
});

usatoApp.controller('addCustomerController', function() {
	
});
