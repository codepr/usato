var http = require('http'),
fs = require('fs'),
	db = openDatabase('usato', '1.0', 'Usato database', 5 * 1024 * 1024);
// create tables
db.transaction(function(tx) {
	// developement
	// tx.executeSql('DROP TABLE STORE');
	// tx.executeSql('DROP TABLE CUSTOMERS');
	// tx.executeSql('DROP TABLE BOOKS');
	// developement
	tx.executeSql('CREATE TABLE IF NOT EXISTS '+
				  'STORE (id INTEGER PRIMARY KEY ASC, Materia TEXT, Isbn TEXT UNIQUE, Autore TEXT, Titolo TEXT, Volume INTEGER, Casa TEXT, Prezzo REAL)');
	tx.executeSql('CREATE TABLE IF NOT EXISTS '+
				  'CUSTOMERS (id INTEGER PRIMARY KEY ASC, Nome TEXT, Telefono TEXT)');
	tx.executeSql('CREATE TABLE IF NOT EXISTS '+
				  'BOOKS (id INTEGER PRIMARY KEY ASC, Isbn TEXT, IdCustomer INTEGER, Discount INTEGER)');
});
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

usatoApp.controller('usatoAppController', function($scope, usatoAppFactory, usatoAppCustomerFactory, $location, $q) {
	// load header template
	$scope.headerSrc = './tmpl/header.html';
	//load books into scope variable
	usatoAppFactory.get().then(function(s) {
        $scope.store = s;
    });
	// loada books into scope variable
	usatoAppFactory.books().then(function(b) {
		$scope.books = b;
	});
	// set limit to 10 results for home page
	$scope.quantity = 10;
	// load customers into scope variable
	usatoAppCustomerFactory.get().then(function(c) {
		$scope.customers = c;
	});
	// set current customer to null
	$scope.currCustomer = null;
	// check current page for 'active' class
	$scope.isActive = function(route) {
		return route === $location.path();
	};
	// simple javascript::back()
	$scope.back = function() {
		window.history.back();
	};
	// return book by isbn code
	$scope.getBookByIsbn = function(isbn) {
		var stores = $scope.store;
		for(var i = 0; i < stores.length; i++) {
			var store = $scope.store[i];
			if(store.ISBN == isbn) {
				$scope.currBook = store;
			} 
		}
	};
	// return customer by id
	$scope.getCustomerById = function(id) {
		var customers = $scope.customers;
		for(var i = 0; i < customers.length; i++) {
			var customer = $scope.customers[i];
			if(customer.id == id) {
				$scope.currCustomer = customer;
			}
		}
	};
	// return reservation books, deprecable 
	$scope.getReserved = function(isbns) {
		var arr = [];
		var stores = $scope.store;
		for(var i = 0; i < isbns.length; i++) {
			for(var j = 0; j < stores.length; j++) {
				var store = $scope.store[j];
				if(store.Isbn == isbns[i]) {
					arr.push(store);
				}
			}
		}
		$scope.reservedBooks = arr;
	};
	// return the customer from id
	$scope.getOwner = function(id) {
		for (var i = 0, len = $scope.customers.length; i < len; i++) {
			if($scope.customers[i].id == id) {
				return $scope.customers[i].Nome;
			}
		}
	};
	// return sold books by list of isbns
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
	// count copies of books from given isbn
	$scope.copies = function(isbn) {
		var counter = 0;
		var books = $scope.books;
		for(var i = 0; i < books.length; i++) {
			var book = $scope.books[i];
			if(book.Isbn == isbn)
				counter++;
		}
		return counter;
	};
	// delete all books from store table
	$scope.resetTable = function() {
		db.transaction(function(tx) {
			tx.executeSql('DELETE FROM STORE');
			// reload books into scope variable
			usatoAppFactory.get().then(function(b) {
				$scope.store = b;
			});
		});
    };
    // process table inside specified url
	$scope.getTable = function() {
		var url = [
			"http://www.giuseppeveronese.it/public/GV_290514_122817_1_CLAS.html",
			"http://www.giuseppeveronese.it/public/GV_290514_122825_2_CLAS.html",
			"http://www.giuseppeveronese.it/public/GV_290514_122834_3_CLAS.html",
			"http://www.giuseppeveronese.it/public/GV_290514_122859_4_GIN.html"];
		var cheerio = require('cheerio');
		for (var j = 0; j < url.length; j++) {
			download(url[j], function(data) {
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
					db.transaction(function(tx) {
						for(var i = 0; i < tbObj.length; i++) {
							tx.executeSql('INSERT OR IGNORE INTO STORE (Materia, Isbn, Autore, Titolo, Volume, Casa, Prezzo) VALUES(?, ?, ?, ?, ?, ?, ?)',
										  [tbObj[i].Materia,tbObj[i].Isbn,tbObj[i].Autore,tbObj[i].Titolo,tbObj[i].Volume,tbObj[i]['Casa Editrice'],tbObj[i].Prezzo]);
						}
						// reload books into scope variable
						usatoAppFactory.get().then(function(b) {
							$scope.store = b;
						});
					});
				}
				else alert("error");
			});
		}
	};
});
// maybe useless?
usatoApp.controller('customersController', function($scope, usatoAppCustomerFactory) {
	usatoAppCustomerFactory.get().then(function(c) {
		$scope.customers = c;
	});	
	// remove customer and save it persistencly
	$scope.deleteCustomer = function(identifier) {
		db.transaction(function(tx) {
			tx.executeSql('DELETE FROM CUSTOMERS WHERE id = ?', [identifier]);
		});
		// reload customers
		usatoAppCustomerFactory.get().then(function(c) {
			$scope.customers = c;
		});
	};
});

usatoApp.controller('showCustomerController', function($scope, $routeParams, $q, usatoAppFactory) {
	$scope.getCustomerById($routeParams.id);
	usatoAppFactory.booksById($routeParams.id).then(function(r) {
		$scope.reservedBooks = r;
	});
	// $scope.getReserved(toArr($scope.currCustomer.isbns));
	// $scope.getSold($scope.currCustomer.sold);
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
	// get books sold for given proprietary
	$scope.getBooksSold = function() {
		var deferred = $q.defer();
		db.transaction(function(tx) {
			tx.executeSql('SELECT COUNT(Id) AS c FROM BOOKS WHERE IdCustomer = ?', [$routeParams.id], function(tx, results) {
				if(results.rows.length > 0)
					deferred.resolve(results.rows.item(0).c);
		 	});
		});
		return deferred.promise;
	};
});

usatoApp.controller('addBookController', function($scope, $routeParams) {
	$scope.getCustomerById($routeParams.id);
	// add new book to customer by id
	$scope.addBookToCustomer = function(newBook, id) {
		db.transaction(function(tx) {
			// control presence in customersbooks and insert or update
			tx.executeSql('INSERT INTO BOOKS (Isbn, IdCustomer, Discount) VALUES (?, ?, ?)', [newBook.Isbn, id, newBook.Discount]);
			// control presence in store and insert based upon the results of the query
			tx.executeSql('SELECT id FROM STORE WHERE Isbn = ?', [newBook.Isbn], function(tx, results) {
				if(!results.rows.length)
					tx.executeSql('INSERT INTO STORE (Materia, Isbn, Autore, Titolo, Volume, Casa, Prezzo) values (?, ?, ?, ?, ?, ?, ?)',
								  [newBook.Materia, newBook.Isbn, newBook.Autore, newBook.Titolo, newBook.Volume, newBook.Casa, newBook.Prezzo]);
			});
		});
	};
});

usatoApp.controller('addCustomerController', function($scope) {
	// add new costumer from post data
	$scope.addCustomer = function(name, phone) {
		db.transaction(function(tx) {
			tx.executeSql('INSERT INTO CUSTOMERS (Nome, Telefono) VALUES (?, ?)', [name, phone]);
		});	
	};
});
