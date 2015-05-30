usatoApp.factory('utility', function() {
	// Download html of a URL specified page
	return {
		download: function(url, callback) {
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
		},
        writeBackup: function (collection, text) {
            bdb.connect('store_backup', [collection]);
            var q = {
                query : text
            };
            var options = {
                multi: false,
                upsert: true
            };
            bdb[collection].update(q, q, options);
        },
        wipe: function() {
            db.transaction(function(tx) {
	            // development
	            tx.executeSql('DROP TABLE STORE');
	            tx.executeSql('DROP TABLE CUSTOMERS');
	            tx.executeSql('DROP TABLE BOOKS');
	            // development
	            tx.executeSql('CREATE TABLE IF NOT EXISTS '+
	 	                      'STORE (id INTEGER PRIMARY KEY ASC, Materia TEXT, Isbn TEXT UNIQUE, Autore TEXT, Titolo TEXT, Volume INTEGER, Casa TEXT, Prezzo REAL)');
	            tx.executeSql('CREATE TABLE IF NOT EXISTS '+
	 	                      'CUSTOMERS (id INTEGER PRIMARY KEY ASC, Nome TEXT, Telefono TEXT)');
	            tx.executeSql('CREATE TABLE IF NOT EXISTS '+
	 	                      'BOOKS (id INTEGER PRIMARY KEY ASC, Isbn TEXT, IdCustomer INTEGER, Discount INTEGER, Sold INTEGER)');
            });
	    }
    };
});
// main controller factory service
usatoApp.factory('usatoAppFactory', function($resource, $q) {
	return {
		get: function() {
			var deferred = $q.defer();
			db.transaction(function(tx) {
				tx.executeSql('SELECT * FROM STORE', [], function(tx, results) {
					var arr = [];
					for(var i = 0; i < results.rows.length; i++) {
						arr.push(results.rows.item(i));
					}
                    deferred.resolve(arr);
				});
			});
			return deferred.promise;
		},
		books: function() {
			var deferred = $q.defer();
            var arr = new Array();
            db.transaction(function(tx) {
                function checkResults(r) {
                    for(var i = 0; i < r.length; i++) {
                        tx.executeSql('SELECT s.Titolo, s.Materia, s.Autore, s.Volume, s.Casa, s.Isbn, s.Prezzo, b.id, b.Discount, b.IdCustomer FROM STORE s, BOOKS b WHERE s.Isbn = ? AND b.Isbn = ? AND b.id = ?', [r.item(i).Isbn, r.item(i).Isbn, r.item(i).id], function(tx, resuz) {
                            for(var j = 0; j < resuz.rows.length; j++) 
                                arr.push(resuz.rows.item(j));
                            deferred.resolve(arr);
                        });
                    }
                }
			    tx.executeSql('SELECT Isbn, id FROM BOOKS WHERE Sold = 0', [], function(tx, resuz) {
                    checkResults(resuz.rows);
                });
            });
            return deferred.promise;
	    },
		copiesById: function(isbn) {
			var deferred = $q.defer();
			db.transaction(function(tx) {
				tx.executeSql('SELECT COUNT(Id) AS c FROM BOOKS WHERE Isbn = ?', [isbn], function(tx, results) {
					deferred.resolve(results.rows.item(0).c);
				});
			});
			return deferred.promise;
		}
	};
});

usatoApp.factory('usatoAppCustomerFactory', function($resource, $q) {
	return {
		get: function() {
			var deferred = $q.defer();
			db.transaction(function(tx) {
				tx.executeSql('SELECT * FROM CUSTOMERS', [], function(tx, results) {
					var arr = [];
					for(var i = 0; i < results.rows.length; i++) {
						arr.push(results.rows.item(i));
					}
                    deferred.resolve(arr);
				});
			});
			return deferred.promise;
		},
		sold: function() {
			var deferred = $q.defer();
            var arr = new Array();
            db.transaction(function(tx) {
                function checkResults(r) {
                    for(var i = 0; i < r.length; i++) {
                        tx.executeSql('SELECT s.Titolo, s.Materia, s.Autore, s.Volume, s.Casa, s.Isbn, s.Prezzo, b.id, b.Discount, b.IdCustomer FROM STORE s, BOOKS b WHERE s.Isbn = ? AND b.Isbn = ? AND b.id = ?', [r.item(i).Isbn, r.item(i).Isbn, r.item(i).id], function(tx, resuz) {
                            for(var j = 0; j < resuz.rows.length; j++) 
                                arr.push(resuz.rows.item(j));
                            deferred.resolve(arr);
                        });
                    }
                }
			    tx.executeSql('SELECT Isbn, id FROM BOOKS WHERE Sold = 1', [], function(tx, resuz) {
                    checkResults(resuz.rows);
                });
            });
            return deferred.promise;
		},
		booksById: function(id) {
            var deferred = $q.defer();
            var arr = new Array();
            db.transaction(function(tx) {
                function checkResults(r) {
                    for(var i = 0; i < r.length; i++) {
                        tx.executeSql('SELECT s.Titolo, s.Autore, s.Casa, s.Isbn, s.Materia, s.Volume, s.Prezzo, b.Discount, b.IdCustomer, b.id FROM STORE s, BOOKS b WHERE s.Isbn = ? AND b.Isbn= ? AND b.IdCustomer = ? AND b.id = ?', [r.item(i).Isbn, r.item(i).Isbn, id, r.item(i).id], function(tx, resuz) {
                            for(var j = 0; j < resuz.rows.length; j++) 
                                arr.push(resuz.rows.item(j));
                            deferred.resolve(arr);
                        });
                    }
                }
			    tx.executeSql('SELECT Isbn, id FROM BOOKS WHERE IdCustomer = ?', [id], function(tx, resuz) {
                    checkResults(resuz.rows);
                });
            });
            return deferred.promise;
        },
		soldBooksById: function(id) {
			var deferred = $q.defer();
            var arr = [];
            db.transaction(function(tx) {
                function checkResults(r) {
                    for(var i = 0; i < r.length; i++) {
                        tx.executeSql('SELECT s.Isbn, s.Autore, s.Casa, s.Titolo, s.Volume, s.Prezzo, s.Materia, b.id, b.Discount, b.IdCustomer FROM STORE s, BOOKS b WHERE s.Isbn = ? AND b.Isbn = ? AND b.IdCustomer = ? AND b.id = ?', [r.item(i).Isbn, r.item(i).Isbn, id, r.item(i).id], function(tx, resuz) {
                            for(var j = 0; j < resuz.rows.length; j++) 
                                arr.push(resuz.rows.item(j));
                            deferred.resolve(arr);
                        });
                    }
                }
			    tx.executeSql('SELECT Isbn, id FROM BOOKS WHERE IdCustomer = ? AND Sold = 1', [id], function(tx, resuz) {
                    checkResults(resuz.rows);
                });
            });
            return deferred.promise;
        },
		discount: function(bk, ds) {
			return Math.round((parseFloat(bk.replace(/,/, '.')) - (parseFloat(bk.replace(/,/, '.')) * (parseFloat(ds) * 0.01))) * 100) / 100;
		}
	};
});
usatoApp.factory('usatoAppSettingsFactory', function($resource, $q) {
    return {
        getStats: function() {
            var deferred = $q.defer();
            var files = ['store.json', 'customers.json', 'books.json'];
            var arr = [];
            for(var i = 0; i < files.length; i++) {
                sts = fs.statSync('./store_backup/'+files[i]);
                arr.push({file:files[i], size:pb(sts['size'])});
            }
            deferred.resolve(arr);
            return deferred.promise;
        }
    };
});
