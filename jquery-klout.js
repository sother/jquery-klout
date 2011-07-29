(function($) {
    
    $.fn.kloutScore = function(apiKey, userOptions) {

        var KLOUT_API_INTERVAL_BETWEEN_CALLS_IN_MILLIS = 1000;
        var KLOUT_API_MAX_INPUT_USERNAMES = 5;
        
        var options = $.extend({
            iconSrc: 'http://sother.github.com/jquery-klout/static/klout-20.png',
            success: function(username, kloutScore, options) {
                $(this).html('<span class="jquery-klout-icon-span"><a href="http://klout.com/' + username + '"><img class="jquery-klout-icon" src="' + options.iconSrc + '"/></a></span>' + Math.round(kloutScore.kscore));
            }
        }, userOptions);

        var elementsByUsername = [];
        var usernames = [];
        var elementCount = 0;
        var totalElements = this.length;
        var usernameBatches = [];
            
        function addElement(element$) {
            var username = element$.text();
            var htmlElement = element$.get(0);
            var element = {'username': username, 'htmlElement': htmlElement};
            addElementByUsername(element, username);
            addUsername(username);
            if (++elementCount == totalElements) {
                createBatches();
                callApi();
            }
        }
        
        function addElementByUsername(element, username) {
            var elementsOfCurrentUsername = elementsByUsername[username];
            elementsOfCurrentUsername = elementsOfCurrentUsername || [];
            elementsOfCurrentUsername.push(element);
            elementsByUsername[username] = elementsOfCurrentUsername;
        }
        
        function addUsername(username) {
            if ($.inArray(username, usernames) == -1) {
                usernames.push(username);
            }
        }
        
        function createBatches() {
            var currentUsernameBatch = [];
            $.each(usernames , function(index, username) {
                currentUsernameBatch.push(username);
                if (currentUsernameBatch.length == KLOUT_API_MAX_INPUT_USERNAMES) {
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
            console.log(currentUsernameBatch);
            var ajaxOptions = {
                url: 'http://api.klout.com/1/klout.json?users='+currentUsernameBatch.join('%2C') + '&key=' + apiKey,
                type: 'GET',
                success: function(xmlHttp) {
                    var responseHtml = xmlHttp.responseText;
                    var dataJson = $($.parseXML(responseHtml)).find('p').text();
                    var data = $.parseJSON(dataJson);
                    for (var i = 0; i < data.users.length; i++) {
                        var kloutScore = data.users[i];
                        $.each(elementsByUsername[kloutScore.twitter_screen_name], function(index, element) {
                            options.success.apply(element.htmlElement, [element.username, kloutScore, options]);
                        });
                    }
                    if (usernameBatches.length > 0) {
                        var elapsedMillis = (new Date()).getMilliseconds() - startMillis;
                        var delayMillis = KLOUT_API_INTERVAL_BETWEEN_CALLS_IN_MILLIS - elapsedMillis;
                        setTimeout(callApi, delayMillis);
                    }
                }
            };
            jQuery.ajax(ajaxOptions);
        }
        
        return this.each(function() {
            addElement($(this));
        });
    };
    
})(jQuery);