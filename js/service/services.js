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
					if(arr.length > 0) deferred.resolve(arr);
					else deferred.reject(arr);
				});
			});
			return deferred.promise;
		},
		books: function() {
			var deferred = $q.defer();
			db.transaction(function(tx) {
				tx.executeSql('SELECT Isbn, id FROM BOOKS WHERE Sold = 0', [], function(tx, results) {
					var r = results.rows;
					var arr = [];
					for(var i = 0; i < r.length; i++) {
						tx.executeSql('SELECT s.Titolo, s.Materia, s.Autore, s.Volume, s.Casa, s.Isbn, s.Prezzo, b.id, b.Discount, b.IdCustomer FROM STORE s, BOOKS b WHERE s.Isbn = ? AND b.Isbn = ? AND b.id = ?', [r.item(i).Isbn, r.item(i).Isbn, r.item(i).id], function(tx, results) {
							for(var j = 0; j < results.rows.length; j++) {
								arr.push(results.rows.item(j));
							}
							if (arr.length > 0) deferred.resolve(arr);
							else deferred.reject(arr);
						});
					}
				});
			});
			return deferred.promise;
		},
		copiesById: function(isbn) {
			var deferred = $q.defer();
			db.transaction(function(tx) {
				tx.executeSql('SELECT COUNT(Id) AS c FROM BOOKS WHERE Isbn = ?', [isbn], function(tx, results) {
					if(results.rows.length > 0)	deferred.resolve(results.rows.item(0).c);
					else deferred.reject(results.rows.item(0).c);
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
					if(arr.length > 0) deferred.resolve(arr);
					else deferred.reject(arr);
				});
			});
			return deferred.promise;
		},
		sold: function() {
			var deferred = $q.defer();
			db.transaction(function(tx) {
				tx.executeSql('SELECT * FROM BOOKS WHERE Sold = 1', [], function(tx, results) {
					var r = results.rows;
					var arr = [];
					for(var i = 0; i < r.length; i++) {
						tx.executeSql('SELECT s.Titolo, s.Materia, s.Autore, s.Volume, s.Casa, s.Isbn, s.Prezzo, b.id, b.Discount, b.IdCustomer FROM STORE s, BOOKS b WHERE s.Isbn = ? AND b.Isbn = ? AND b.id = ?', [r.item(i).Isbn, r.item(i).Isbn, r.item(i).id], function(tx, results) {
							for(var j = 0; j < results.rows.length; j++) {
								arr.push(results.rows.item(j));
							}
							if(arr.length > 0) deferred.resolve(arr);
							else deferred.reject(arr);
						});
					}
				});
			});
			return deferred.promise;
		},
		booksById: function(id) {
			var deferred = $q.defer();
			db.transaction(function(tx) {
				tx.executeSql('SELECT Isbn, id FROM BOOKS WHERE IdCustomer = ?', [id], function(tx, results) {
					var r = results.rows;
					var arr = [];
					for(var i = 0; i < r.length; i++) {
						tx.executeSql('SELECT s.Titolo, s.Autore, s.Casa, s.Isbn, s.Materia, s.Volume, s.Prezzo, b.Discount, b.IdCustomer, b.id FROM STORE s, BOOKS b WHERE s.Isbn = ? AND b.Isbn= ? AND b.IdCustomer = ? AND b.id = ?', [r.item(i).Isbn, r.item(i).Isbn, id, r.item(i).id], function(tx, results) {
							for(var j = 0; j < results.rows.length; j++) {
								arr.push(results.rows.item(j));
							}
							if(arr.length > 0) deferred.resolve(arr);
							else deferred.reject(arr);
						});
					}
				});
			});
			return deferred.promise;
		},
		soldBooksById: function(id) {
			var deferred = $q.defer();
			db.transaction(function(tx) {
				tx.executeSql('SELECT Isbn, id FROM BOOKS WHERE IdCustomer = ? AND Sold = 1', [id], function(tx, results) {
					var r = results.rows;
					var arr = [];
					for (var i = 0, len = r.length; i < len; i++) {
						tx.executeSql('SELECT s.Isbn, s.Autore, s.Casa, s.Titolo, s.Volume, s.Prezzo, s.Materia, b.id, b.Discount, b.IdCustomer FROM STORE s, BOOKS b WHERE s.Isbn = ? AND b.Isbn = ? AND b.IdCustomer = ? AND b.id = ?', [r.item(i).Isbn, r.item(i).Isbn, id, r.item(i).id],function(tx, results) {
							for(var j = 0; j < results.rows.length; j++) {
								arr.push(results.rows.item(j));
							}
							if(arr.length > 0) deferred.resolve(arr);
							else deferred.reject(arr);
						});
					}
				});
			});
			return deferred.promise;
		}
	};
});
