var http = require('http'),
    db = openDatabase('usato', '1.0', 'Usato database', 50 * 1024 * 1024),
    bdb = require('diskdb'),
    fs = require('fs'),
    pb = require('pretty-bytes');
// main controller
usatoApp.controller('MainController', function($scope, utility, usatoAppFactory, usatoAppCustomerFactory, $location) {
    $(document).ready(function() {
        $('.table-container').hide(0).fadeIn(400);
    });
    $scope.reservedBooks = {};
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
    // return book by id
    $scope.getBookById = function(id) {
        var books = $scope.store;
		for(var i = 0; i < books.length; i++) {
			var book = $scope.store[i];
			if(book.id == id) {
				$scope.currBook = book;
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
	// return the customer from id
	$scope.getOwner = function(id) {
        if(typeof $scope.customers !== 'undefined' && $scope.customers) {
		    for(var i = 0, len = $scope.customers.length; i < len; i++) {
			    if($scope.customers[i].id == id) {
				    return $scope.customers[i].Nome;
			    }
		    }
        } else { 
            return 'Unknown'; 
        }
        return 0;
	};
	// get discount for a given book
	$scope.getDiscount = function(bk, ds) {
        if(utility.isInt(bk)) {
            bk += ",00";
        }
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
    $(document).ready(function() {
        $('.table-container').hide(0).fadeIn(400);
    });
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
    $(document).ready(function() {
        $('.table-container').hide(0).fadeIn(400);
    });
	$scope.getCustomerById($routeParams.id);
    // reload books for a user
    $scope.$on('refreshReserved', function(event) {
        $scope.reservedBooks = null;
	    usatoAppCustomerFactory.booksById($routeParams.id).then(function(r) {
		    $scope.reservedBooks = r;
	    });
    });
    $scope.$emit('refreshReserved');
    // refresh the promises, have to work-around for a better solution
    setTimeout(function() {
        $scope.$apply();
    }, 500);
    // reload function, for emergency
    $scope.reload = function() {
        $scope.$apply();
    };
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
        if(typeof rbooks !== 'undefined' && rbooks) {
		    for(var i = 0; i < rbooks.length; i++) {
                if(typeof rbooks[i].Prezzo !== 'undefined' && utility.isInt(rbooks[i].Prezzo)) {
                    rbooks[i].Prezzo += ",00";
                }
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
        if(typeof sbooks !== 'undefined' && sbooks) {
		    for(var i = 0; i < sbooks.length; i++) {
                if(typeof sbooks[i].Prezzo !== 'undefined' && utility.isInt(sbooks[i].Prezzo)) {
                    sbooks[i].Prezzo += ",00";
                }
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
        if(utility.isInt(bk)) {
            bk += ",00";
        }
		return usatoAppCustomerFactory.discount(bk,ds);
	};
});
// book addition management, form validations
usatoApp.controller('addBookController', function($scope, $routeParams, utility) {
    $(document).ready(function() {
        $('.table-container').hide(0).fadeIn(400);
    });
    $('#success-alert').alert();
	$('#success-alert').hide();
    $(document).ready(function() {
       $(window).keydown(function(e) {
          if(e.keyCode == 13) {
              e.preventDefault();
          }
       });
    });
    $scope.newBook = {};
	$scope.$emit('refreshStore');
    $scope.$watch('newBook.Prezzo', function(price) {
        if(typeof $scope.newBook.Prezzo !== 'undefined') {
            if(!new RegExp(/^\d+$/).test(price)) {
                $scope.newBook.Prezzo = $scope.newBook.Prezzo.substring(0, $scope.newBook.Prezzo.length - 1);
            }
        }
    });
    $scope.$watch(function(scope) {
        return scope.newBook.Discount;
    }, function(newDiscount) {
        if(typeof $scope.newBook.Discount !== 'undefined') {
            if(!new RegExp(/^\d+$/).test(newDiscount)) {
                $scope.newBook.Discount = $scope.newBook.Discount.substring(0, $scope.newBook.Discount.length - 1);
            }
        }
    });
	// watch for change on isbn field in addbook form
	$scope.$watch('newBook.Isbn', function(isbnValue) {
        if(typeof $scope.newBook.Isbn !== 'undefined') {
            if(!new RegExp(/^\d+$/).test(isbnValue)) {
                $scope.newBook.Isbn = $scope.newBook.Isbn.substring(0, $scope.newBook.Isbn.length - 1);
            }
        }
        if($scope.store) {
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
                    if(utility.isInt(newBook.Prezzo)) {
                        newBook.Prezzo += ",00";
                    }
					tx.executeSql('INSERT INTO STORE (Materia, Isbn, Autore, Titolo, Volume, Casa, Prezzo) VALUES (?, ?, ?, ?, ?, ?, ?)',
						[newBook.Materia, newBook.Isbn, newBook.Autore, newBook.Titolo, newBook.Volume, newBook.Casa, newBook.Prezzo]);
                    utility.writeBackup('store','INSERT INTO STORE (Materia, Isbn, Autore, Titolo, Volume, Casa, Prezzo) VALUES ("'+utility.eq(newBook.Materia)+'","'+newBook.Isbn+'","'+utility.eq(newBook.Autore)+'","'+utility.eq(newBook.Titolo)+'","'+newBook.Volume+'","'+utility.eq(newBook.Casa)+ '","'+newBook.Prezzo+'")');
                }
			}, function(tx, err) {
                console.log("Error adding book to customer: " + err.message);
            });
		});
		// call alert for success operation
		
		$('#success-alert').fadeTo(2000, 500).fadeOut(1000, function() {
			$('#success-alert').hide();
		});
        utility.writeBackup('books', 'INSERT INTO BOOKS (Isbn, IdCustomer, Discount, Sold) VALUES ("'+newBook.Isbn+'","'+id+'","'+newBook.Discount+'","'+0+'")');
	};
});
// customer addition managing and form validations
usatoApp.controller('addCustomerController', function($scope, $location, utility) {
    $(document).ready(function() {
        $('.table-container').hide(0).fadeIn(400);
    });
    $scope.$watch(function(scope) {
        return scope.customer.phone;
    }, function(newPhone) {
        if(typeof newPhone !== 'undefined') {
            if(!new RegExp(/^\d+$/).test(newPhone)) {
                $scope.customer.phone = $scope.customer.phone.substring(0, $scope.customer.phone.length - 1);
            }
        }
    });
	// add new costumer from post data
	$scope.addCustomer = function(name, phone) {
		db.transaction(function(tx) {
			tx.executeSql('INSERT INTO CUSTOMERS (Nome, Telefono) VALUES (?, ?)', [name, phone]);
		});
		// refresh customers scope variable
		$scope.$emit('refresh');
        utility.writeBackup('customers', 'INSERT INTO CUSTOMERS (Nome, Telefono) VALUES ("'+utility.eq(name)+'","'+phone+'")');
		$location.path('/customers');
	};
});
usatoApp.controller('alterArchiveController', function($scope, utility, $routeParams) {
    $(document).ready(function() {
        $('.table-container').hide(0).fadeIn(400);
    });
    $('#success-alert').alert();
	$('#success-alert').hide();
    $(document).ready(function() {
       $(window).keydown(function(e) {
          if(e.keyCode == 13) {
              e.preventDefault();
          }
       });
    });
    $scope.getBookById($routeParams.id);
    $scope.newBook = {};
    $scope.$watch('newBook.Prezzo', function(price) {
        if(typeof $scope.newBook.Prezzo !== 'undefined') {
            if(!new RegExp(/^\d+$/).test(price)) {
                $scope.newBook.Prezzo = $scope.newBook.Prezzo.substring(0, $scope.newBook.Prezzo.length-1);
            }
        }
    });
    $scope.$watch('newBook.Volume', function(volume) {
        if(typeof $scope.newBook.Volume !== 'undefined') {
            if(!new RegExp(/^\d+$/).test(volume)) {
                $scope.newBook.Volume = $scope.newBook.Volume.substring(0, $scope.newBook.Volume.length-1);
            }
        }
    });
    $scope.$watch('newBook.Isbn', function(isbnValue) {
        if(typeof $scope.newBook.Isbn !== 'undefined') {
            if(!new RegExp(/^\d+$/).test(isbnValue)) {
                $scope.newBook.Isbn = $scope.newBook.Isbn.substring(0, $scope.newBook.Isbn.length-1);
            }
        }
        if($scope.store) {
		    for(var i = 0; i < $scope.store.length; i++) {
			    if($scope.store[i].Isbn == isbnValue) {
				    // copy object into newBook obj except Isbn, or it will cause a loop and input box would became unchangeable
				    $scope.newBook.Titolo = $scope.store[i].Titolo;
				    $scope.newBook.Autore = $scope.store[i].Autore;
				    $scope.newBook.Prezzo = $scope.store[i].Prezzo;
				    $scope.newBook.Materia = $scope.store[i].Materia;
				    $scope.newBook.Casa = $scope.store[i].Casa;
                    $scope.newBook.Volume = $scope.store[i].Volume;
			    }
		    }
        }
	});
    $scope.newBook.Isbn = $scope.currBook.Isbn;
    $scope.alterBook = function(newBook, id) {
        db.transaction(function(tx) {
			// control presence in customersbooks and insert or update
			tx.executeSql('UPDATE BOOKS SET Isbn = ?, Discount = ? WHERE id = ?', [newBook.Isbn, newBook.Discount, id], function() {
                console.log("Succesfully updated books.");
            }, function(tx, err) {
                console.log("Error updating books: " + err.message);
            });
            if(utility.isInt(newBook.Prezzo)) {
                newBook.Prezzo += ",00";
            }
			// control presence in store and insert based upon the results of the query
			tx.executeSql('UPDATE STORE SET Materia = ?, Isbn = ?, Autore = ?, Titolo = ?, Volume = ?, Casa = ?, Prezzo = ? WHERE id = ?',
                          [newBook.Materia, newBook.Isbn, newBook.Autore, newBook.Titolo, newBook.Volume, newBook.Casa, newBook.Prezzo, id],
                          function(tx, results) {
                              utility.writeBackup('store','UPDATE STORE SET Materia = "'+utility.eq(newBook.Materia)+'", Isbn = "'+newBook.Isbn+'", Autore = "'+utility.eq(newBook.Autore)+'", Titolo = "'+utility.eq(newBook.Titolo)+'", Volume = "'+newBook.Volume+'", Casa = "'+utility.eq(newBook.Casa)+ '", Prezzo = "'+newBook.Prezzo+'" WHERE id = "'+id+'"');
                              $scope.$emit('refreshStore');
			              }, function(tx, err) {
                              console.log("Error updating book to customer: " + err.message);
                          });
		});
		// call alert for success operation
		$('#success-alert').fadeTo(2000, 500).fadeOut(1000, function() {
			$('#success-alert').hide();
		});
        utility.writeBackup('books', 'UPDATE BOOKS SET Isbn = "'+newBook.Isbn+'", IdCustomer = "'+id+'", Discount = "'+newBook.Discount+'", Sold = "'+0+'"');
    };
});
// controller for archive page, download and managing of books archive
usatoApp.controller('archiveController', function($scope, utility) {
    $(document).ready(function() {
        $('.table-container').hide(0).fadeIn(400);
    });
    $('#success-alert-arc').alert();
	$('#success-alert-arc').hide();
	// add book to archive
    $(document).ready(function() {
       $(window).keydown(function(e) {
          if(e.keyCode == 13) {
              e.preventDefault();
          }
       });
    });
    // delete a book from archive
    $scope.deleteBookFromStore = function(id) {
        var c = confirm("Cancellare il libro selezionato dall'archivio?");
        if(c == true) {
		    db.transaction(function(tx) {
			    tx.executeSql('DELETE FROM STORE WHERE Id = ?', [id], function() {
                    console.log("Succesfully deleted book from store.");
                    $scope.$emit('refreshStore');
                }, function(tx, err) {
                    console.log("Error deleting book from store: " + err.message);
                });
		    });
        }
    };
    // add a book to archive
	$scope.addToArchive = function(book) {
        if(utility.isInt(book.Prezzo)) {
            book.Prezzo += ",00";
        }
		db.transaction(function(tx) {
			tx.executeSql('INSERT OR IGNORE INTO STORE (Materia, Isbn, Autore, Titolo, Volume, Casa, Prezzo) VALUES (?, ?, ?, ?, ?, ?, ?)',
				[book.Materia, book.Isbn, book.Autore, book.Titolo, book.Vol, book.Casa, book.Prezzo]);
            $scope.$emit('refreshStore');
            utility.writeBackup('store','INSERT OR IGNORE INTO STORE (Materia, Isbn, Autore, Titolo, Volume, Casa, Prezzo) VALUES ("'+utility.eq(book.Materia)+'","'+book.Isbn+'","'+utility.eq(book.Autore)+'","'+utility.eq(book.Titolo)+'","'+book.Vol+'","'+utility.eq(book.Casa)+'","'+book.Prezzo+'")');
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
                            utility.writeBackup('store','INSERT OR IGNORE INTO STORE (Materia, Isbn, Autore, Titolo, Volume, Casa, Prezzo) VALUES("'+utility.eq(tbObj[i].Materia)+'","'+tbObj[i].Isbn+'","'+utility.eq(tbObj[i].Autore)+'","'+utility.eq(tbObj[i].Titolo)+'","'+tbObj[i].Volume+'","'+utility.eq(tbObj[i]['Casa Editrice'])+'","'+tbObj[i].Prezzo+'")\n');
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
    $(document).ready(function() {
        $('.table-container').hide(0).fadeIn(400);
    });
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
				console.log(JSON.stringify(col[1]));
			}
		});
	};
    // init db, first time
    $scope.init = function() {
        var c = confirm("Verrà creato un nuovo database, i dati esistenti saranno cancellati.\nProcedere?");
        if(c == true) {
            utility.init();
            $scope.$emit('refresh');
            $scope.$emit('refreshStats');
            $scope.$emit('refreshBooks');
            $scope.$emit('refreshStore');
            $scope.$emit('refreshSold');
        }
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
        var c = confirm("Ripristino dei dati dell'applicazione:\nOgni dato sarà sovrascritto.\nProcedere?");
        if(c == true) {
            utility.restore();
            $scope.$emit('refresh');
            $scope.$emit('refreshStats');
            $scope.$emit('refreshBooks');
            $scope.$emit('refreshStore');
            $scope.$emit('refreshSold');
        }
    };
    // active debug tools
    $scope.openDebug = function() {
        require('nw.gui').Window.get().showDevTools();
    };
    // dev tool
    $scope.genRngCustomers = function() {
        for(var i = 0; i < 4000; i++) {
            db.transaction(function(tx) {
                tx.executeSql("INSERT INTO CUSTOMERS(Nome, Telefono) VALUES(?, ?)", ["Mario", 3469086783], function(tx) {
                    console.log("Random customer succesfully inserted.");
                }, function(tx, err) {
                    console.log("Error inserting random customer " + err.message);
                });
                // books
                tx.executeSql("INSERT INTO BOOKS(Isbn, IdCustomer, Discount, Sold) VALUES(?, ?, ?, )?", ["213231239213","3", "23", 0], function(tx) {
                    console.log("Random book succesfully inserted.");
                }, function(tx, err) {
                    console.log("Error inserting random book " + err.message);
                });
                
            });
        }
    };
});
    