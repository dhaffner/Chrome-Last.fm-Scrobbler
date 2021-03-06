(function() {
    var options;
    var current = {};

    var track = function(context) {
        var player = $(context);
        if (player.hasClass('set'))
            return $('li.playing .info a', player).text();

        var title = $('.soundTitle__title', player);
        if (title.length)
            return title.text();

        else
            return $('.info-header h3 a, .info-header h1 em', player).text();
    };

    var artist = function(context) {
        var node = $('.info-header .user-name', context);
        if (node.length)
            return node[0].text;

        node = $('.soundTitle__username', context);
        if (node.length)
            return node[0].text;
    };

    var duration = function(context) {
        var node = $('span.duration', context);
        if (node.length)
            return parseInt($(node).attr('title').substring(2), 10);

        node = $('.timeIndicator__total', context);
        if (node.length) {
            // time is given as h.m.s
            var digits = node[0].innerHTML.split(/\D/),
                seconds = 0, length, digit;

            length = digits.length;
            if (length > 3)
                return;

            while (digits.length) {
                d = digits.pop();
                seconds += parseInt(d, 10) * Math.pow(60, length - digits.length - 1);
            }
            return seconds;
        }
    };

    var song = function(context) {
        return {
               'track': track(context),
              'artist': artist(context),
            'duration': duration(context)
        };
    };

    var container = function(context) {
        var parent;
        parent = $(context).closest('li.set')[0] ||  // 'old' soundcloud
                 $(context).closest('div.player')[0] ||
                 $(context).closest('div.sound.playing')[0];  // 'new' ...

        if (!parent) {
            // Couldn't find container element for this song...
        }

        return parent;
    };

    $(document).ready(function() {
        var selectors = 'div.timeIndicator__current, .timecodes .editable';

        $(selectors).live('DOMSubtreeModified', function() {
            var next = $(this).hasClass('timeIndicator__current');

            var parent = $(this).closest('.playing');
            if (!parent.length)
                return;

            if (!current || !current.context || current.context[0] != parent[0]) {
                current = {submitted: false};
                current.context = parent;
            }

            if (!current.player) {
                current.player = container(current.context);
                return;
            }

            if (current.validating)
                return;

            if (next && !parent.hasClass('endOfSound'))
                return;

            var playhead = $('.playhead[style]', parent);
            if (!next && parseFloat(playhead.attr('style').substring(6)) < 70)
                return;

            current.validating = true;

            var s = song(current.player);
            chrome.extension.sendRequest({type: 'validate',
                                        artist: s.artist,
                                         track: s.track},
            function(response) {
                current.validated = response;
                if (response !== false) {
                    chrome.extension.sendRequest({type: 'nowPlaying',
                                                artist: response.artist,
                                                 track: response.track,
                                              duration: s.duration});
                }

                else {
                    chrome.extension.sendRequest({type: 'nowPlaying',
                                              duration: s.duration});
                }
            });
        });
    });

    $(window).unload(function() {
        chrome.extension.sendRequest({type: 'reset'});
        return true;
    });
})();
