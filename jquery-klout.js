(function($) {

    $.getKloutScores = function(usernames, userOptions) {

    	var options = $.extend({
    		complete: function(kloutScores, kloutScoresWithError) {}
    	}, userOptions);
 
		var strategy = {
			processSuccessItems: $.noop(),
        	processErrorItems: $.noop()
		}

    	kloutInternal(usernames, null, options, strategy);
    };

    $.fn.kloutScore = function(userOptions) {

    	var elementsByUsername = {};
    	var usernames = [];
    	
    	var options = $.extend({
    		usernameGetter: function() {
    			return $(this).data('klout-username');
    		},
    		batchItemSuccess: function(username, options, kloutScore) {
    			$(this).html('<span class="jquery-klout-icon-span"><a href="http://klout.com/' + username + '"><img class="jquery-klout-icon" src="' + options.iconSrc + '"/></a></span>' + Math.round(kloutScore.kscore));
    		},
    		batchItemError: function(username, options, status) {
    			$(this).html('<span class="jquery-klout-error">not found</span>');
    		},
    		complete: function(kloutScores, kloutScoresWithError) {}
    	}, userOptions);
 
		var strategy = {
			processSuccessItems: function(usernameBatch, data) {
				$.each(data.users, function(index, kloutScore){
					$.each(elementsByUsername[kloutScore.twitter_screen_name], function(index, element) {
						options.batchItemSuccess.apply(element.htmlElement, [element.username, options, kloutScore]);
					});
					delete elementsByUsername[kloutScore.twitter_screen_name];
				});
        	},
        	processErrorItems: function(usernameBatch, textStatus) {
                $.each(usernameBatch, function(index, username) {
                    $.each(elementsByUsername[username] || [], function(index, element) {
                        options.batchItemError.apply(element.htmlElement, [element.username, options, textStatus]);
                    });
                    delete elementsByUsername[username];
                });
        	}
		}

        var elementCount = 0;
        var totalElements = this.length;
        
        function addElement(element$) {
        	var htmlElement = element$.get(0);
            var username = options.usernameGetter.apply(htmlElement);
            var element = {'username': username, 'htmlElement': htmlElement};
            addElementByUsername(element, username);
            addUsername(username);
            if (++elementCount == totalElements) {
            	kloutInternal(usernames, elementsByUsername, options, strategy);
            }
        }
        
        function addElementByUsername(element, username) {
            var elementsOfCurrentUsername = (elementsByUsername[username] || []);
            elementsOfCurrentUsername.push(element);
            elementsByUsername[username] = elementsOfCurrentUsername;
        }
        
        function addUsername(username) {
            if ($.inArray(username, usernames) == -1) {
                usernames.push(username);
            }
        }

        return this.each(function() {
            addElement($(this));
        });
    };
    
    function kloutInternal(usernames, elementsByUsername, options, strategy) {

    	var KLOUT_API_MAX_REQUESTS_PER_SECOND = 10;
        var KLOUT_API_MAX_INPUT_USERNAMES = 5;
        var YQL_KLOUT_SCORE_URL = "http://query.yahooapis.com/v1/public/yql?q=SELECT%20*%20FROM%20klout.score%20WHERE%20users%20in%20(USERNAMES)%20AND%20api_key%3D'" + options.apiKey + "'&format=json&env=http%3A%2F%2Fdatatables.org%2Falltables.env";

        var usernameBatches = [];
        var batchSize = KLOUT_API_MAX_REQUESTS_PER_SECOND * KLOUT_API_MAX_INPUT_USERNAMES;

    	var kloutScores = [];
    	var kloutScoresWithError = [];

        function getUrl(usernameBatch) {
        	return YQL_KLOUT_SCORE_URL.replace('USERNAMES', "'" + usernameBatch.join("'%2C%20'") + "'");
        }
        
        function createBatches() {
            var currentUsernameBatch = [];
            $.each(usernames , function(index, username) {
                currentUsernameBatch.push(username);
                if (currentUsernameBatch.length == batchSize) {
                    usernameBatches.push(currentUsernameBatch);
                    currentUsernameBatch = [];    
                }
            });
            if (currentUsernameBatch.length > 0) {
                usernameBatches.push(currentUsernameBatch);
            }
        }
        
        function callApi() {
            var startMillis = (new Date()).getMilliseconds();
            var currentUsernameBatch = usernameBatches.shift();
            $.ajax({
                url: getUrl(currentUsernameBatch),
                dataType: 'jsonp',
                success: function(yqlResult) {
                	if (yqlResult.query.results && yqlResult.query.results.users && yqlResult.query.results.users.length > 0) {
                		strategy.processSuccessItems(currentUsernameBatch, yqlResult.query.results)
            			$.each(yqlResult.query.results.users, function(index, kloutScore){
            				kloutScores.push(kloutScore)
            			});
                	}
                	strategy.processErrorItems(currentUsernameBatch, 'not found');
                },
	            complete: function() {
	                if (usernameBatches.length > 0) {
	                    var elapsedMillis = (new Date()).getMilliseconds() - startMillis;
	                    var delayMillis = 1000 - elapsedMillis;
	                    if (delayMillis <= 0) {
	                    	callApi();
	                    } else {
	                    	setTimeout(callApi, delayMillis);
	                    }
	                } else {
	                	options.complete(kloutScores, kloutScoresWithError);
	                }
	            }
            });
        }
    
	    createBatches();
	    callApi();
    }
    
})(jQuery);