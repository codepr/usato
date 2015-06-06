var http = require('http'),
    db = openDatabase('usato', '1.0', 'Usato database', 5 * 1024 * 1024),
    bdb = require('diskdb'),
    fs = require('fs'),
    pb = require('pretty-bytes');
// main controller
usatoApp.controller('MainController', function($scope, utility, usatoAppFactory, usatoAppCustomerFactory, $location) {
	// load header template
	$scope.headerSrc = './tmpl/header.html';
	// load books into scope variable
	$scope.$on('refreshStore', function(event) {
        $scope.store = null;
		usatoAppFactory.get().then(function(s) {
			$scope.store = s;
		});
	});
	$scope.$emit('refreshStore');
	// load books into scope variable
	$scope.$on('refreshBooks', function(event) {
        $scope.books = null;
		usatoAppFactory.books().then(function(b) {
		 	$scope.books = b;
		});                    
	});
	$scope.$emit('refreshBooks');
	// listen for event 'refresh' and refresh customers list
    $scope.$on('refresh', function(event) {
        $scope.customers = null;
		 usatoAppCustomerFactory.get().then(function(c) {
			$scope.customers = c;
		});
   	});
	$scope.$emit('refresh');
	// refresh solds book list
	$scope.$on('refreshSold', function(event) {
        $scope.soldBooks = null;
		usatoAppCustomerFactory.sold().then(function(s) {
			$scope.soldBooks = s;
		});
	});
	$scope.$emit('refreshSold');
	// check current page for 'active' class
	$scope.isActive = function(route) {
		return route === $location.path();
	};
	// simple javascript::back()
	$scope.back = function() {
		window.history.back();
	};
	// simple javascript::print()
	$scope.print = function() {
		window.print();
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
	// return the customer from id
	$scope.getOwner = function(id) {
        if(typeof $scope.customers !== 'undefined') {
		    for(var i = 0, len = $scope.customers.length; i < len; i++) {
			    if($scope.customers[i].id == id) {
				    return $scope.customers[i].Nome;
			    }
		    }
        } else { 
            return 'Unknown'; 
        }
	};
	// get discount for a given book
	$scope.getDiscount = function(bk, ds) {
		return usatoAppCustomerFactory.discount(bk,ds);
	};
	// sell selected book
	$scope.sell = function(bid) {
        var c = confirm("Libro selezionato per la vendita.\nProcedere?");
        if(c == true) {
		    db.transaction(function(tx) {
			    tx.executeSql('UPDATE BOOKS SET Sold = 1 WHERE id = ?', [bid]);
                // reload books
		        $scope.$emit('refreshBooks');
                // reload sold
		        $scope.$emit('refreshSold');
		    });
            utility.writeBackup('books', 'UPDATE BOOKS SET Sold = 1 WHERE id = '+bid+'');
        }
	};
});
// customers managing and CRUD
usatoApp.controller('customersController', function($scope, utility) {
	$scope.$emit('refreshBooks');
	// remove customer and save it persistencly
	$scope.deleteCustomer = function(identifier) {
        var c = confirm("Cancellare il cliente selezionato dal database? Tutti i libri allegati al cliente andranno cancellati.");
        if(c == true) {
		    db.transaction(function(tx) {
			    tx.executeSql('DELETE FROM CUSTOMERS WHERE id = ?', [identifier]);
			    tx.executeSql('DELETE FROM BOOKS WHERE IdCustomer = ?', [identifier]);
                // reload customers
		        $scope.$emit('refresh');
		    });
        }
	};
	// check if that user have sold all his books
	$scope.allSold = function(idc) {
		var tots = 0;
        if(typeof $scope.books !== 'undefined') {
		    for (var j = 0, len = $scope.books.length; j < len; j++) {
			    if($scope.books[j].IdCustomer == idc) {
				    tots++;
			    }
		    }
        } else { tots = 0; }
		return tots > 0;
	};
});
// single customer managing, access granted by id
usatoApp.controller('showCustomerController', function($scope, $routeParams, usatoAppCustomerFactory, utility) {
	$scope.getCustomerById($routeParams.id);
    // reload books for a user
    $scope.$on('refreshReserved', function(event) {
        $scope.reservedBooks = null;
	    usatoAppCustomerFactory.booksById($routeParams.id).then(function(r) {
		    $scope.reservedBooks = r;
	    });
    });
    $scope.$emit('refreshReserved');
	// get sold book list for a given user
	usatoAppCustomerFactory.soldBooksById($routeParams.id).then(function(sb) {
		$scope.soldBooksByMe = sb;
	});
	// remove a copy of book for the current customer
	$scope.deleteCopy = function(idc) {
        var c = confirm("Cancellare il libro selezionato dalla scheda cliente?");
        if(c == true) {
		    db.transaction(function(tx) {
			    tx.executeSql('DELETE FROM BOOKS WHERE IdCustomer = ? AND Id = ?', [$routeParams.id, idc]);
		    });
            $scope.$emit('refreshReserved');
        }
	};
	// restore a book from sell list to unsell
	$scope.restore = function(bid) {
        var c = confirm("Ripristinare la vendita reinserendola nella giacenza invenduta? (Voce menu 'Libri')");
        if(c == true) {
		    db.transaction(function(tx) {
			    tx.executeSql('UPDATE BOOKS SET Sold = 0 WHERE IdCustomer = ? AND id = ?', [$routeParams.id, bid]);
                utility.writeBackup('books', 'UPDATE BOOKS SET Sold = 0 WHERE IdCustomer = '+$routeParams.id+' AND id = '+bid+'');
		    });
            // refresh general sold list
		    $scope.$emit('refreshSold');
		    // refresh sold list
            $scope.soldBooksByMe = null;
		    usatoAppCustomerFactory.soldBooksById($routeParams.id).then(function(sb) {
			    $scope.soldBooksByMe = sb;
		    });
        }
	};
	// get total cost of reserved books
	$scope.getTotal = function() {
		var TOT = {total: 0, dtotal: 0};
		var rbooks = $scope.reservedBooks;
        if(typeof rbooks !== 'undefined') {
		    for(var i = 0; i < rbooks.length; i++) {
			    TOT.total += parseFloat(rbooks[i].Prezzo.replace(/,/, '.'));
			    TOT.dtotal += parseFloat(rbooks[i].Prezzo.replace(/,/, '.')) - (parseFloat(rbooks[i].Prezzo.replace(/,/, '.')) * (parseFloat(75) * 0.01));
		    }
		    TOT.total = Math.round(TOT.total * 100) / 100;
		    TOT.dtotal = Math.round(TOT.dtotal * 100) / 100;
        } else {
            TOT.total = 0;
            TOT.dtotal = 0;
        }
		return TOT;
	};
	// get total cost of sold books
	$scope.getTotalSold = function() {
		var TOT = {total: 0, dtotal: 0};
		var sbooks = $scope.soldBooksByMe;
        if(typeof sbooks !== 'undefined') {
		    for(var i = 0; i < sbooks.length; i++) {
			    TOT.total += parseFloat(sbooks[i].Prezzo.replace(/,/, '.'));
			    TOT.dtotal += parseFloat(sbooks[i].Prezzo.replace(/,/, '.')) - (parseFloat(sbooks[i].Prezzo.replace(/,/, '.')) * (parseFloat(75) * 0.01));
		    }
		    TOT.total = Math.round(TOT.total * 100) / 100;
		    TOT.dtotal = Math.round(TOT.dtotal * 100) / 100;
        } else {
            TOT.total = 0;
            TOT.dtotal = 0;
        }
		return TOT;
	};
	// get discount for a given book
	$scope.getDiscount = function(bk, ds) {
		return usatoAppCustomerFactory.discount(bk,ds);
	};
});
// book addition management, form validations
usatoApp.controller('addBookController', function($scope, $routeParams, utility) {
    $('#success-alert').alert();
	$('#success-alert').hide();
	$scope.$emit('refreshStore');
	// watch for change on isbn field in addbook form
	$scope.$watch('newBook.Isbn', function(isbnValue) {
		for(var i = 0; i < $scope.store.length; i++) {
			if($scope.store[i].Isbn == isbnValue) {
				// copy object into newBook obj except Isbn, or it will cause a loop and input box would became unchangeable
				$scope.newBook.Titolo = $scope.store[i].Titolo;
				$scope.newBook.Autore = $scope.store[i].Autore;
				$scope.newBook.Prezzo = $scope.store[i].Prezzo;
				$scope.newBook.Materia = $scope.store[i].Materia;
				$scope.newBook.Casa = $scope.store[i].Casa;
			}
		}
	});
	// set currCustomer
	$scope.getCustomerById($routeParams.id);
	// add new book to customer by id
	$scope.addBookToCustomer = function(newBook, id) {
		db.transaction(function(tx) {
			// control presence in customersbooks and insert or update
			tx.executeSql('INSERT INTO BOOKS (Isbn, IdCustomer, Discount, Sold) VALUES (?, ?, ?, ?)', [newBook.Isbn, id, newBook.Discount, 0]);
			// control presence in store and insert based upon the results of the query
			tx.executeSql('SELECT id FROM STORE WHERE Isbn = ?', [newBook.Isbn], function(tx, results) {
				if(!results.rows.length) {
					tx.executeSql('INSERT INTO STORE (Materia, Isbn, Autore, Titolo, Volume, Casa, Prezzo) VALUES (?, ?, ?, ?, ?, ?, ?)',
						[newBook.Materia, newBook.Isbn, newBook.Autore, newBook.Titolo, newBook.Volume, newBook.Casa, newBook.Prezzo]);
                    utility.writeBackup('store','INSERT INTO STORE (Materia, Isbn, Autore, Titolo, Volume, Casa, Prezzo) VALUES ('+newBook.Materia+','+newBook.Isbn+','+newBook.Autore+','+newBook.Titolo+','+newBook.Volume+','+newBook.Casa+ ','+newBook.Prezzo+')');
                }
			});
		});
		// call alert for success operation
		
		$('#success-alert').fadeTo(2000, 500).fadeOut(1000, function() {
			$('#success-alert').hide();
		});
        utility.writeBackup('books', 'INSERT INTO BOOKS (Isbn, IdCustomer, Discount, Sold) VALUES ('+newBook.Isbn+','+id+','+newBook.Discount+','+0+')');
	};
});
// customer addition managing and form validations
usatoApp.controller('addCustomerController', function($scope, $location, utility) {
	// add new costumer from post data
	$scope.addCustomer = function(name, phone) {
		db.transaction(function(tx) {
			tx.executeSql('INSERT INTO CUSTOMERS (Nome, Telefono) VALUES (?, ?)', [name, phone]);
		});
		// refresh customers scope variable
		$scope.$emit('refresh');
        utility.writeBackup('customers', 'INSERT INTO CUSTOMERS (Nome, Telefono) VALUES ('+name+','+phone+')');
		$location.path('/customers');
	};
});
// controller for archive page, download and managing of books archive
usatoApp.controller('archiveController', function($scope, utility) {
    $('#success-alert-arc').alert();
	$('#success-alert-arc').hide();
	// add book to archive
	$scope.addToArchive = function(book) {
		db.transaction(function(tx) {
			tx.executeSql('INSERT OR IGNORE INTO STORE (Materia, Isbn, Autore, Titolo, Volume, Casa, Prezzo) VALUES (?, ?, ?, ?, ?, ?, ?)',
				[book.Materia, book.Isbn, book.Autore, book.Titolo, book.Vol, book.Casa, book.Prezzo]);
            $scope.$emit('refreshStore');
            utility.writeBackup('store','INSERT OR IGNORE INTO STORE (Materia, Isbn, Autore, Titolo, Volume, Casa, Prezzo) VALUES ('+book.Materia+','+book.Isbn+','+book.Autore+','+book.Titolo+','+book.Vol+','+book.Casa+','+book.Prezzo+')');
		});
		// call alert for success operation
		$('#success-alert-arc').fadeTo(2000, 500).fadeOut(1000, function() {
			$('#success-alert-arc').hide();
		});
	};
	// get links for books
	var cheerio = require('cheerio');
	var url = [];
	utility.download('http://www.giuseppeveronese.it/segreteria/libri_testo.aspx', function(data) {
		if(data) {
			var $ = cheerio.load(data);
			var links = $('table a');
			$(links).each(function(i, link) {
				if(/..\/public\/GV_290514/.test($(link).attr('href'))) {
					url.push("http://www.giuseppeveronese.it/" + $(link).attr('href').substring(3));
				}
			});
		}
	});
	// delete all books from store table
	$scope.resetTable = function() {
        var c = confirm("L'archivio verrà cancellato:\nProcedere?");
        if(c == true) {
		    db.transaction(function(tx) {
			    tx.executeSql('DELETE FROM STORE');
			    // reload books into scope variable
			    $scope.$emit('refreshStore');
		    });
        }
	};
	// process table inside specified url
	$scope.getTable = function() {
		for (var j = 0; j < url.length; j++) {
			utility.download(url[j], function(data) {
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
                            tbObj[i].Titolo = (tbObj[i].Titolo).replace(/\uFFFD/g, 'A\'');
							tx.executeSql('INSERT OR IGNORE INTO STORE (Materia, Isbn, Autore, Titolo, Volume, Casa, Prezzo) VALUES(?, ?, ?, ?, ?, ?, ?)',
								[tbObj[i].Materia,tbObj[i].Isbn,tbObj[i].Autore,tbObj[i].Titolo,tbObj[i].Volume,tbObj[i]['Casa Editrice'],tbObj[i].Prezzo]);
                            utility.writeBackup('store','INSERT OR IGNORE INTO STORE (Materia, Isbn, Autore, Titolo, Volume, Casa, Prezzo) VALUES('+tbObj[i].Materia+','+tbObj[i].Isbn+','+tbObj[i].Autore+','+tbObj[i].Titolo+','+tbObj[i].Volume+','+tbObj[i]['Casa Editrice']+','+tbObj[i].Prezzo+')\n');
						}
						// reload books into scope variable
						$scope.$emit('refreshStore');
					});
				}
				else alert("Errore nel parsing dei link");
			});
		}
	};
});

usatoApp.controller('settingsController', function($scope, utility, usatoAppSettingsFactory) {
    $scope.$on('refreshStats', function(event) {
        usatoAppSettingsFactory.getStats().then(function(s) {
		    $scope.stats = s;
	    });
    });
    $scope.$emit('refreshStats');
    // development function ****** REMOVE ******
	$scope.getLinks = function() {
		var cheerio = require('cheerio');
		utility.download('http://www.giuseppeveronese.it/segreteria/libri_testo.aspx', function(data) {
			if(data) {
				var $ = cheerio.load(data);
				var links = $('table a');
				var col = [];
				$(links).each(function(i, link) {
					if(/..\/public\/GV_290514/.test($(link).attr('href')))
					col.push($(link).attr('href'));
				});
				alert(JSON.stringify(col[0]));
			}
		});
	};
    // total wipe rest
    $scope.wipe = function() {
        var c = confirm("Reset completo dell'applicazione:\nOgni dato sarà cancellato definitivamente.\nProcedere?");
        if(c == true) {
            utility.wipe();
            $scope.$emit('refresh');
            $scope.$emit('refreshStats');
            $scope.$emit('refreshBooks');
            $scope.$emit('refreshStore');
            $scope.$emit('refreshSold');
        }
    };
    // restore from files
    $scope.fullRestore = function() {
        // var c = confirm("Ripristino dei dati dell'applicazione:\nOgni dato sarà sovrascritto.\nProcedere?");
        // if(c == true) {
        //     utility.restore();
        //     $scope.$emit('refresh');
        //     $scope.$emit('refreshStats');
        //     $scope.$emit('refreshBooks');
        //     $scope.$emit('refreshStore');
        //     $scope.$emit('refreshSold');
        // }
    };
});
    