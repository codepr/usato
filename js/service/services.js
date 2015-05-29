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
