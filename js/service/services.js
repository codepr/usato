var db = openDatabase('usato', '1.0', 'Usato database', 5 * 1024 * 1024);

usatoApp.factory('usatoAppFactory', function($resource, $q) {
    return {
        get: function() {
			var deferred = $q.defer();
			db.transaction(function(tx) {
				tx.executeSql('SELECT * FROM STORE', [], function(tx, results) {
					var arr = [];
					for(var i = 0; i < results.rows.length; i++)
						arr.push(results.rows.item(i));
					if(arr.length > 0) deferred.resolve(arr);
					else deferred.reject(arr);
				});
			});
			return deferred.promise;
        },
		books: function() {
			var deferred = $q.defer();
			db.transaction(function(tx) {
				tx.executeSql('SELECT Isbn, id FROM BOOKS', [], function(tx, results) {
					var r = results.rows;
					var arr = [];
					for(var i = 0; i < r.length; i++) {
						tx.executeSql('SELECT s.*, b.Discount, b.IdCustomer FROM STORE s, BOOKS b WHERE s.Isbn = ? AND b.Isbn = ? AND b.id = ?', [r.item(i).Isbn, r.item(i).Isbn, r.item(i).id], function(tx, results) {
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
		booksById: function(id) {
			var deferred = $q.defer();
			db.transaction(function(tx) {
				tx.executeSql('SELECT Isbn FROM BOOKS WHERE id = ?', [id], function(tx, results) {
					var r = results.rows;
					var arr = [];
					for(var i = 0; i < r.length; i++) {
						tx.executeSql('SELECT s.*, b.Discount, b.IdCustomer, b.Id FROM STORE s, BOOKS b WHERE s.Isbn = ? AND b.Isbn= ? AND b.IdCustomer = ?', [r.item(i).Isbn, r.item(i).Isbn, id], function(tx, results) {
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
		copiesById: function(isbn) {
			var deferred = $q.defer();
			db.transaction(function(tx) {
				tx.executeSql('SELECT COUNT(Id) AS c FROM BOOKS WHERE Isbn = ?', [isbn], function(tx, results) {
					if(results.rows.length > 0)
						deferred.resolve(results.rows.item(0).c);
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
					for(var i = 0; i < results.rows.length; i++)
						arr.push(results.rows.item(i));
					if(arr.length > 0)
						deferred.resolve(arr);
					else deferred.reject(arr);
				});
			});
			return deferred.promise;
		},
		sold: function() {
			var deferred = $q.defer();
			db.transaction(function(tx) {
				tx.executeSql('SELECT * FROM CUSTOMERS WHERE Sold = 1', [], function(tx, results) {
					var arr = [];
					for (var i = 0, len = results.rows.length; i < len; i++) 
						arr.push(results.rows.item(i));
					if(arr.length > 0)
						deferred.resolve(arr);
					else deferred.reject(arr);
				});
			});
			return deferred.promise;
		}
	};
});
