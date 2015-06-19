var db = openDatabase('usato', '1.0', 'Usato database', 50 * 1024 * 1024);
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
        isInt: function(value) {
            if(isNaN(value)) {
                return false;
            }
            var x = parseFloat(value);
            return (x | 0) === x;
        },
        eq: function(str) {
            if(typeof str === 'undefined') {
                return '';
            } else {
                return str.replace(/['"]/g, "\'");
            }
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
        restore: function() {
            db.transaction(function(tx) {
                var files = ['store.json', 'customers.json', 'books.json'];
                for(var i = 0; i < files.length; i++) {
                    var data = fs.readFileSync('./store_backup/'+files[i]);
                    var dt = JSON.parse(data);
                    for(var j = 0; j < dt.length; j++) {
                        console.log(dt[j].query);
                        tx.executeSql(dt[j].query, [], function() {
                            console.log('Successfully executed query');
                        }, function(tx, err) {
                            console.log('Error executing query: ' + err.message);
                        });
                    }
                }
            });
        },
        init: function() {
            db.transaction(function(tx) {
                tx.executeSql('DROP TABLE IF EXISTS STORE',[], function() {
                    console.log('Successfully dropped table STORE');
                }, function(tx, err) {
                    console.log('Error dropping STORE: ' + err.message);
                });
	            tx.executeSql('DROP TABLE IF EXISTS CUSTOMERS', [], function() {
                    console.log('Succesfully dropped table CUSTOMERS');
                }, function(tx, err) {
                    console.log('Error dropping CUSTOMERS: ' + err.message);
                });
	            tx.executeSql('DROP TABLE IF EXISTS BOOKS', [], function() {
                    console.log('Succesfully dropped table BOOKS');
                }, function(tx, err) {
                    console.log('Error dropping BOOKS: ' + err.message);
                });
	            tx.executeSql('CREATE TABLE IF NOT EXISTS STORE (id INTEGER PRIMARY KEY ASC, Materia TEXT, Isbn TEXT UNIQUE, Autore TEXT, Titolo TEXT, Volume INTEGER, Casa TEXT, Prezzo REAL)', [], function() {
                    console.log('Succesfully created table STORE');
                }, function(tx, err) {
                    console.log('Error creating STORE: ' + err.message);
                });
	            tx.executeSql('CREATE TABLE IF NOT EXISTS CUSTOMERS (id INTEGER PRIMARY KEY ASC, Nome TEXT, Telefono TEXT)', [], function() {
                    console.log('Succesfully created table CUSTOMERS');
                }, function(tx, err) {
                    console.log('Error creating CUSTOMERS: ' + err.message);
                });
	            tx.executeSql('CREATE TABLE IF NOT EXISTS BOOKS (id INTEGER PRIMARY KEY ASC, Isbn TEXT, IdCustomer INTEGER, Discount INTEGER, Sold INTEGER)', [], function(){
                    console.log('Succesfully created table BOOKS');
                }, function(tx, err) {
                    console.log('Error creating BOOKS: ' + err.message);
                });
            });
        },
        wipe: function() {
            db.transaction(function(tx) {
                tx.executeSql('DELETE FROM STORE', [], function() {
                    console.log('Successfully deleted STORE');
                }, function(tx, err) {
                    console.log('Error deleting STORE: ' + err.message);
                });
                tx.executeSql('DELETE FROM CUSTOMERS', [], function() {
                    console.log('Succesfully deleted CUSTOMERS');
                }, function(tx, err) {
                    console.log('Error deleting CUSTOMERS: ' + err.message);
                });
                tx.executeSql('DELETE FROM BOOKS', [], function() {
                    console.log('Succesfully deleted BOOKS');
                }, function(tx, err) {
                    console.log('Error deleting BOOKS: ' + err.message);
                });
            });
            fs.unlinkSync('./store_backup/store.json');
            fs.unlinkSync('./store_backup/books.json');
            fs.unlinkSync('./store_backup/customers.json');
            fs.writeFileSync('./store_backup/store.json', "[]");
            fs.writeFileSync('./store_backup/books.json', "[]");
            fs.writeFileSync('./store_backup/customers.json', "[]");
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
