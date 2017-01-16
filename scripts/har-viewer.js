/**
 * Copyright 2011 Subbu Allamaraju
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

/**
 * See https://github.com/s3u/har-view for the latest.
 *
 * See https://github.com/s3u/har-view/blob/master/examples/index.html for an example.
 */
(function ($) {
    var HarView = function (element, options) {
        var reqTemplate = "<div data-id='{{id}}-req' class='request'>\
            <span class='plus' data-id='{{id}}'>&nbsp;&nbsp;&nbsp;</span>\
            <span class='method' data-id='{{id}}-method'>{{request.method}}</span>\
            <span class='url' data-id='{{id}}-url' title='{{request.url}}'>{{request.url}}</span>\
            <span class='status' data-id='{{id}}-status'>{{response.status}}</span>\
            <span class='statusText' data-id='{{id}}-statusText'>{{response.statusText}}</span>\
            <span class='bodySize' data-id='{{id}}-bodySize'></span>\
            <span><span class='time' data-id='{{id}}-time'>0</span> msec</span>\
            <span class='timelineBar' data-id='{{id}}-timeline'></span>\
        </div>";
        var summaryTemplate = "<div data-id='summary' class='summary'>\
            <span class='reqCount' data-id='reqCount'></span>\
            <span class='reqSize' data-id='totalReqSize'></span>\
            <span class='respSize' data-id='totalRespSize'></span>\
            <span class='time' data-id='totalTime'></span>\
        </div>";

        var detailsTemplate = "<div class='details' data-id='{{id}}-details'>\
            <td colspan='7'>\
                <div data-id='{{id}}-tabs'>\
                    <ul>\
                        <li><a href='#{{id}}-tab-0'>Headers</a></li>\
                        <li><a href='#{{id}}-tab-1'>Params</a></li>\
                        <li><a href='#{{id}}-tab-2'>Request</a></li>\
                        <li><a href='#{{id}}-tab-3'>Response</a></li>\
                    </ul>\
                    <div data-id='{{id}}-tab-0'>\
                        <p class='header'>Request headers</p>\
                        <div data-id='{{id}}-req-headers'></div>\
                        <p class='header'>Response headers</p>\
                        <div data-id='{{id}}-resp-headers'></div>\
                    </div>\
                    <div data-id='{{id}}-tab-1'>\
                        <pre data-id='{{id}}-query-string' class='body'></pre>\
                    </div>\
                    <div data-id='{{id}}-tab-2'>\
                        <pre data-id='{{id}}-req-body' class='body'></pre>\
                    </div>\
                    <div data-id='{{id}}-tab-3'>\
                        <pre data-id='{{id}}-resp-body' class='body'></pre>\
                    </div>\
                </div>\
            </td>\
        </div>";

        var headersTemplate = "<table>\
            {{#headers}}\
            <tr>\
                <td>{{name}}:</td>\
                <td>{{value}}</td>\
            </tr>\
            {{/headers}}\
        </table>";

        var timingsTemplate = "<span data-id='{{id}}-lpad' class='timelinePad' style='width:{{timings._lpad}}%'></span><span\
          data-id='{{id}}-blocked' class='timelineSlice timelineBlocked' style='width:{{timings.blocked}}%'></span><span\
          data-id='{{id}}-dns' class='timelineSlice timelineDns' style='width:{{timings.dns}}%'></span><span\
          data-id='{{id}}-connect' class='timelineSlice timelineConnect' style='width:{{timings.connect}}%'></span><span\
          data-id='{{id}}-send' class='timelineSlice timelineSend' style='width:{{timings.send}}%'></span><span\
          data-id='{{id}}-wait' class='timelineSlice timelineWait' style='width:{{timings.wait}}%'></span><span\
          data-id='{{id}}-receive' class='timelineSlice timelineReceive' style='width:{{timings.receive}}%'></span><span\
          data-id='{{id}}-rpad' class='timelinePad' style='width:{{timings._rpad}}%'></span>";

        $(element).addClass('har');
        $(element).append($(summaryTemplate));

        var log = {
            entries: {}
        };
        var totals = {};
        var pads = {};
        var left, right;

        var reqCount = 0;
        var totalReqSize = 0;
        var totalRespSize = 0;
        var totalTime = 0;

        this.render = function(har) {
            var that = this;
            var pageref;
            var id = 0;
            $.each(har.log.entries, function (index, entry) {
                pageref = pageref || entry.pageref;
                if(entry.pageref === pageref) {
                    that.entry(id, entry);
                    id = id + 1;
                }
            });
        }

        this.entry = function(id, entry) {
            log.entries[id] = entry;
            var t = new Date(entry.startedDateTime).getTime();
            if(left && right) {
                left = (left < t) ? left : t;
                right = (right > t) ? right : t;
            }
            else {
                left = right = t;
            }

            if(entry.request) {
                this.request(id, entry.request);
            }
            if(entry.response) {
                this.response(id, entry.response);
            }
            if(entry.timings) {
                this.timings(id, entry.timings);
            }
        }

        this.request = function (id, request) {
            if(!$('[data-id=' + id + '-req]', element).html()) {
                _render(id);
            }
            if(log.entries[id]) {
                log.entries[id].request = request;
            }
            else {
                log.entries[id] = {
                    id: id,
                    request: request
                };
            }
            _updateRequest(id, request);

            reqCount = reqCount + 1;
            _updateField('[data-id=reqCount]', reqCount + ((reqCount == 1) ?  ' request,' : ' requests,'));
            if(request.headersSize && request.headersSize > 0) {
                totalReqSize = totalReqSize + request.headersSize;
            }
            if(request.bodySize && request.bodySize > 0) {
                totalReqSize = totalReqSize + request.bodySize;
            }
            _updateField('[data-id=totalReqSize]', 'Total request ' + totalReqSize + ' bytes,');
        };

        // left: min(startedDateTime)
        // right: max(startdDateTime + time)
        this.timings = function (id, timings) {
            var total = 0;
            $.each(timings, function (key, value) {
                if(value > -1 && value != "") {
                    total += value;
                }
            });
            _updateField('[data-id=' + id + '-time]', total > -1 ? total : 0);
            totalTime = totalTime + total;
            _updateField('[data-id=totalTime]', totalTime + ' msec');

            var data = log.entries[id];
            if(data) {
                data.timings = timings;
                data.time = total;
                var t = new Date(data.startedDateTime).getTime();
                t = t + total;
                right = (right > t) ? right : t;

                var html = Mustache.to_html(timingsTemplate, {
                    timings: timings,
                    id: id
                });
                $('[data-id=' + id + '-timeline]', element).append($(html));
                $('[data-id=' + id + '-timeline]', element).attr('title', JSON.stringify(data.timings));

                _updateAllTimings();

            }
            else {
                // Error otherwise
            }

        };

        this.response = function (id, response) {
            if(log.entries[id]) {
                log.entries[id].response = response;
                _updateResponse(id, response);

                if(response.headersSize && response.headersSize > 0) {
                    totalRespSize = totalRespSize + response.headersSize;
                }
                if(response.bodySize && response.bodySize > 0) {
                    totalRespSize = totalRespSize + response.bodySize;
                }
                _updateField('[data-id=totalRespSize]', 'Total response ' + totalRespSize + ' bytes');
            }
            else {
                // Error otherwise
            }
        }

        var _render = function (id) {
            var html, source, dest;
            var data = log.entries[id], timings = {};
            html = Mustache.to_html(reqTemplate, {
                id: id,
                time: totals[id],
                request: data.request,
                response: data.response,
                timings: timings
            });

            $(html).insertBefore($('[data-id=summary]', element));

            html = Mustache.to_html(detailsTemplate, {
                id: id,
                time: totals[id],
                request: data.request,
                response: data.response,
                timings: timings
            });

            $(html).insertBefore($('[data-id=summary]', element));

            source = $('#' + id);
            source.click(function (event) {
                if($('[data-id=' + event.target.id + ']', element).hasClass('plus')) {
                    $('[data-id=' + event.target.id+ ']', element).removeClass('plus');
                    $('[data-id=' + event.target.id+ ']', element).addClass('minus');
                    $('[data-id=' + event.target.id + '-details]', element).show();
                }
                else {
                    $('[data-id=' + event.target.id+ ']', element).removeClass('minus');
                    $('[data-id=' + event.target.id+ ']', element).addClass('plus');
                    $('[data-id=' + event.target.id + '-details]', element).hide();
                }
            });
            $('[data-id=' + id + '-details]', element).hide();

            // Enable tabbed view
            $('[data-id=' + id + '-tabs]', element).tabs();

        };

        var _updateRequest = function (id, request) {
            _updateField('[data-id=' + id + '-method]', request.method);
            _updateField('[data-id=' + id + '-url]', request.url);
            $('[data-id=' + id + '-url]', element).resizable({handles: 'e'});
            $('[data-id=' + id + '-url]', element).bind('resize', function (event, ui) {
                $('.url').width(ui.size.width);
            });

            if(request.headers) {
                _updateHeaders(id, true, request.headers);
            }
            if(request.queryString && request.queryString.length > 0) {
                _updateQueryString(id, request.queryString);
            }
            else {
                $('[data-id=' + id + '-tabs]', element).tabs('disable', 1);
            }
            if(request.postData && request.postData.text) {
                _updateField('[data-id=' + id + '-req-body]', request.postData.text);
            }
            else {
                $('[data-id=' + id + '-tabs]', element).tabs('disable', 2);
            }
        };

        var _updateResponse = function (id, response) {
            _updateField('[data-id=' + id + '-status]', response.status);
            if(response.statusText) {
                _updateField('[data-id=' + id + '-statusText]', response.statusText);
            }

            if(response.headers) {
                _updateHeaders(id, false, response.headers);
            }
            if(response.content && response.content.text) {
                _updateField('[data-id=' + id + '-resp-body]', response.content.text);
                _updateField('[data-id=' + id + '-bodySize]', response.bodySize);
            }
            else {
                $('[data-id=' + id + '-tabs]').tabs('disable', 3);
            }
        }

        var _updateField = function (id, field) {
            if(field) {
                $(id, element).text(field);
            }
        }

        var _updateHeaders = function (id, isRequest, headers) {
            var html = Mustache.to_html(headersTemplate, {
                headers: headers
            });

            $('[data-id=' + id + (isRequest ? '-req-headers]' : '-resp-headers]')).append($(html));
        }

        var _updateQueryString = function (id, queryString) {
            var html = Mustache.to_html(headersTemplate, {
                headers: queryString
            });

            $('[data-id=' + id + '-query-string]', element).append($(html));
        }

        var _updateAllTimings = function () {
            $.each(log.entries, function (id, data) {
                if(data.timings) {
                    var total = 0;
                    $.each(data.timings, function (key, value) {
                        if(value > -1) {
                            total += value;
                        }
                    });

                    var t = new Date(data.startedDateTime).getTime();
                    pads[id] = [t - left, right - t - total];
                    totals[id] = total + pads[id][0] + pads[id][1];

                    var frac = 100 / totals[id];
                    $.each(data.timings, function (key, value) {
                        var width = (value < 0 || value == "") ? 0 : value;
                        if(width > 0) {
                            $('[data-id=' + id + '-' + key + ']', element).width(width * frac + '%');
                        }
                        else {
                            $('[data-id=' + id + '-' + key+ ']', element).css('border', 'none');
                        }
                    });
                    $('[data-id=' + id + '-lpad]', element).width(pads[id][0] * frac + '%');
                    $('[data-id=' + id + '-rpad]', element).width(pads[id][1] * frac + '%');
                }
            });
        }
    };

    $.fn.HarView = function (options) {
        return this.each(function () {
            var element = $(this);

            // Return early if this element already has a plugin instance
            if(element.data('HarView')) return;

            // pass options to plugin constructor
            var harView = new HarView(this, options);

            // Store plugin object in this element's data
            element.data('HarView', harView);
        });
    };
})(jQuery);
