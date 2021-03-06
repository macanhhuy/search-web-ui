/*
 * JBoss, Home of Professional Open Source
 * Copyright 2012 Red Hat Inc. and/or its affiliates and other contributors
 * as indicated by the @authors tag. All rights reserved.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

goog.provide('org.jboss.search.App');

goog.require('org.jboss.search.LookUp');
goog.require('org.jboss.search.page.filter.DateFilter');
goog.require('org.jboss.search.page.filter.ProjectFilter');
goog.require('org.jboss.search.page.filter.AuthorFilter');
goog.require('org.jboss.search.list.project.Project');
goog.require('org.jboss.search.page.element.Status');
goog.require('org.jboss.search.page.SearchPage');
goog.require('org.jboss.search.util.fragmentParser');
goog.require('org.jboss.search.util.fragmentParser.INTERNAL_param');
goog.require('org.jboss.search.util.fragmentParser.UI_param_suffix');
goog.require('org.jboss.search.suggestions.event.EventType');
goog.require('org.jboss.search.service.QueryServiceXHR');
goog.require('org.jboss.search.service.QueryServiceCached');
goog.require('org.jboss.search.InitDeferred');
goog.require('org.jboss.search.Constants');
goog.require('org.jboss.search.context.RequestParams.Order');

goog.require('goog.async.Deferred');
goog.require('goog.events');
goog.require('goog.events.EventType');
goog.require('goog.string');
goog.require('goog.dom');
goog.require('goog.dom.classes');
goog.require('goog.net.ImageLoader');
goog.require('goog.Disposable');
goog.require('goog.History');
goog.require('goog.Uri');

goog.require('goog.debug.Logger');

// Added to get rid of advanced compilation errors - Closure dependencies are broken ?
goog.require('goog.net.XhrLite');
/*
 The is used to get rid of compilation error
 [Goog.ERROR]: JSC_TYPE_PARSE_ERROR. Bad type annotation. Unknown type goog.debug.ErrorHandle ...
 ... closure-library/closure/goog/events/events.js line 896 : 11

 Correct solution is described here:
 http://code.google.com/p/closure-library/wiki/FrequentlyAskedQuestions
 */
goog.require('goog.debug.ErrorHandler');

/**
 * Constructor of the JBoss Search Application.
 * @constructor
 * @extends {goog.Disposable}
 */
org.jboss.search.App = function() {

    goog.Disposable.call(this);

    // prevent page being cached by browser
    // this ensures JavaScript is executed on browser BACK button
    this.unloadId_ = goog.events.listen(goog.dom.getWindow(), goog.events.EventType.UNLOAD, goog.nullFunction);

    // init Status window (consider doing it earlier)
    var status_window = /** @type {!HTMLDivElement} */ (goog.dom.getElement('status_window'))
    var status = new org.jboss.search.page.element.Status(status_window);
    status.show('Initialization...');

    var log = goog.debug.Logger.getLogger('org.jboss.search.App');
    log.info("Search App initialization...");

    // ================================================================
    // A shortcut
    // ================================================================
    var const_ = org.jboss.search.Constants;

    // ================================================================
    // Instantiate LookUp instance
    // ================================================================
    var lookup_ = org.jboss.search.LookUp.getInstance();

    // setup ImageLoader that does pre-load images.
    lookup_.setImageLoader(new goog.net.ImageLoader());
    // setup production QueryService (cached version)
    lookup_.setQueryService(
        new org.jboss.search.service.QueryServiceCached(
            new org.jboss.search.service.QueryServiceXHR( lookup_.getQueryServiceDispatcher() )
        )
    );

    // ================================================================
    // Get necessary HTML elements
    // ================================================================

    var query_field = /** @type {!HTMLInputElement} */ (goog.dom.getElement('query_field'));
    var spinner_div = /** @type {!HTMLDivElement} */ (goog.dom.getElement('query_field_div_spinner'));
    var clear_query_div = /** @type {!HTMLDivElement} */ (goog.dom.getElement('query_field_div_x'));
    var query_suggestions_div = /** @type {!HTMLDivElement} */ (goog.dom.getElement('search_suggestions'));

    var date_filter_body_div    = /** @type {!HTMLDivElement} */ (goog.dom.getElement('date_filter'));
    var project_filter_body_div = /** @type {!HTMLDivElement} */ (goog.dom.getElement('project_filter'));
    var author_filter_body_div  = /** @type {!HTMLDivElement} */ (goog.dom.getElement('author_filter'));

    var date_histogram_chart_div = /** @type {!HTMLDivElement} */ (goog.dom.getElement('date_histogram_chart'));
    var date_filter_from_field = /** @type {!HTMLInputElement} */ (goog.dom.getElement('date_filter_from_field'));
    var date_filter_to_field = /** @type {!HTMLInputElement} */ (goog.dom.getElement('date_filter_to_field'));
    var date_order = /** @type {!HTMLSelectElement} */ (goog.dom.getElement('date_order'));

    var project_filter_query_field = /** @type {!HTMLInputElement} */ (goog.dom.getElement('project_filter_query_field'));
    var author_filter_query_field  = /** @type {!HTMLInputElement} */ (goog.dom.getElement('author_filter_query_field'));

    var second_filters_row_div = /** @type {!HTMLDivElement} */ (goog.dom.getElement('second_filters_row'));

    var date_filter_tab_div    = /** @type {!HTMLDivElement} */ (goog.dom.getElementByClass('date', second_filters_row_div));
    var author_filter_tab_div  = /** @type {!HTMLDivElement} */ (goog.dom.getElementByClass('author', second_filters_row_div));
    var project_filter_tab_div = /** @type {!HTMLDivElement} */ (goog.dom.getElementByClass('project', second_filters_row_div));

    var search_results_div = /** @type {!HTMLDivElement} */ (goog.dom.getElement('search_results'));

    // ================================================================
    // Define internal variables and objects
    // ================================================================

    // get our window
//    var window_ = window || goog.dom.getWindow(goog.dom.getOwnerDocument(query_field));
    var history = org.jboss.search.LookUp.getInstance().getHistory();

    var searchPageContext = goog.getObjectByName('document');

    /**
     * Sets given query string to URL fragment.
     * Basically, this function is called by the search page; whenever user selects or input search query this function
     * gets called. It changes URL fragment and thus calls navigatorController.
     *
     * @param {!org.jboss.search.context.RequestParams} requestParams
     */
    var urlSetFragmentFunction = function(requestParams) {
        var p_ = org.jboss.search.util.fragmentParser.UI_param_suffix;

        // always use query
        var token = [[p_.QUERY,goog.string.urlEncode(requestParams.getQueryString())].join('')];

        // use 'page' is provided and greater then 1
        if (goog.isDefAndNotNull(requestParams.getPage()) && requestParams.getPage() > 1) {
            token.push([p_.PAGE,goog.string.urlEncode(requestParams.getPage())].join(''));
        }

        // use 'from' if available
        if (goog.isDefAndNotNull(requestParams.getFrom()) && goog.isDateLike(requestParams.getFrom())) {
            var from_ = requestParams.getFrom().toXmlDateTime(true);
            token.push([p_.FROM,goog.string.urlEncode(from_)].join(''));
        }

        // use 'to' if available
        if (goog.isDefAndNotNull(requestParams.getTo()) && goog.isDateLike(requestParams.getTo())) {
            var to_ = requestParams.getTo().toXmlDateTime(true);
            token.push([p_.TO,goog.string.urlEncode(to_)].join(''));
        }

        // use 'order' if available and NOT equals to {@link org.jboss.search.context.RequestParams.Order.SCORE}
        if (goog.isDefAndNotNull(requestParams.getOrder())) {
            if (requestParams.getOrder() != org.jboss.search.context.RequestParams.Order.SCORE) {
                token.push([p_.SORT_BY,goog.string.urlEncode(requestParams.getOrder())].join(''));
            }
        }

        // if log was used in previous call, keep it
        /** @type {org.jboss.search.context.RequestParams} */
        var requestParams_ = org.jboss.search.util.fragmentParser.parse(history.getToken());
        var log = requestParams_.getLog();
        if (goog.isDefAndNotNull(log) && !goog.string.isEmpty(log)) {
            token.push([p_.LOG, goog.string.urlEncode(log)].join(''));
        }

        history.setToken(token.join('&'));
    };

    var searchPageElements = new org.jboss.search.page.SearchPageElements(
        query_field, spinner_div, clear_query_div, query_suggestions_div,
        date_filter_tab_div, project_filter_tab_div, author_filter_tab_div,
        date_filter_body_div, project_filter_body_div, author_filter_body_div,
        date_histogram_chart_div, date_filter_from_field, date_filter_to_field,
        date_order,
        project_filter_query_field, author_filter_query_field,
        search_results_div
    );

    if (!searchPageElements.isValid()) {
        throw new Error('Missing some HTML elements!');
    }

    this.searchPage = new org.jboss.search.page.SearchPage(searchPageContext, searchPageElements);

    this.searchEventListenerId_ = goog.events.listen(this.searchPage,
        org.jboss.search.page.event.EventType.QUERY_SUBMITTED,
        function (e) {
            var event = /** @type {org.jboss.search.page.event.QuerySubmitted} */ (e);
            var qp_ = event.getRequestParams();
            urlSetFragmentFunction(qp_);
        }
    );

    // navigation controller
    var navigationController = goog.bind(function (e) {
        // e.isNavigate (true if value in browser address bar is changed manually)
        /** @type {org.jboss.search.context.RequestParams} */
        var requestParams = org.jboss.search.util.fragmentParser.parse(e.token);
        if (goog.isDefAndNotNull(requestParams.getQueryString())) {
            this.searchPage.runSearch(requestParams);
        } else {
            this.searchPage.clearSearchResults();
        }
    }, this);

    // activate URL History manager
    this.historyListenerId_ = goog.events.listen(history, goog.history.EventType.NAVIGATE, navigationController);

    // ================================================================
    // Initialization of filters
    // ================================================================

    // ## Date Filter
    var dateFilterDeferred = new goog.async.Deferred();

    // ## Author Filter
    var authorFilterDeferred = new goog.async.Deferred();

    // ## Project Filter
    var projectFilterDeferred = new goog.async.Deferred();

    // wait for all deferred initializations to finish and enable search GUI then
    var asyncInit = new org.jboss.search.InitDeferred();
    asyncInit
        // this is just an effect to hide status window as it is not needed now
        .addCallback(function(){
            setTimeout(function(){
                status.hide();
                status.setProgressValue(0);
            },200);
        })
        // start history pooling loop after initialization is finished
        .addCallback(function(){
            history.setEnabled(true);
            query_field.placeholder="Search";
            query_field.removeAttribute(org.jboss.search.Constants.DISABLED);
        });

    // projectList will be initialized at some point in the future (it is deferred type)
    // once it is initialized it calls the deferred that is passed as an argument
    var projectList = new org.jboss.search.list.project.Project(projectFilterDeferred);

    projectFilterDeferred
        // keep project list data in the lookup (so it can be easily used by other objects in the application)
        .addCallback(function() {
            lookup_.setProjectMap(projectList.getMap());
            lookup_.setProjectArray(projectList.getArray());
        })
        // initialize project filter and keep reference in the lookup
        .addCallback(function(){
            var projectFilter = new org.jboss.search.page.filter.ProjectFilter(
                searchPageElements.getProject_filter_body_div(),
                searchPageElements.getProject_filter_query_field(),
                function() {
                    goog.dom.classes.remove(searchPageElements.getDate_filter_tab_div(), org.jboss.search.Constants.SELECTED);
                    goog.dom.classes.add(searchPageElements.getProject_filter_tab_div(), org.jboss.search.Constants.SELECTED);
                    goog.dom.classes.remove(searchPageElements.getAuthor_filter_tab_div(), org.jboss.search.Constants.SELECTED);

                    goog.dom.classes.remove(searchPageElements.getProject_filter_body_div(), org.jboss.search.Constants.HIDDEN);
                    goog.dom.classes.add(searchPageElements.getDate_filter_body_div(), org.jboss.search.Constants.HIDDEN);
                    goog.dom.classes.add(searchPageElements.getAuthor_filter_body_div(), org.jboss.search.Constants.HIDDEN);

                    searchPageElements.getProject_filter_query_field().focus();
                    searchPageElements.getAuthor_filter_query_field().blur();
                },
                function() {
                    goog.dom.classes.remove(searchPageElements.getProject_filter_tab_div(), org.jboss.search.Constants.SELECTED);
                    goog.dom.classes.add(searchPageElements.getProject_filter_body_div(), org.jboss.search.Constants.HIDDEN);
                    searchPageElements.getProject_filter_query_field().blur();
                }
            );
            lookup_.setProjectFilter(projectFilter);
            projectFilter.init();
        })
        .addCallback(function() {
            status.setProgressValue(1);
            asyncInit.setProjectFilterDone();
        });

    authorFilterDeferred
        .addCallback(function() {
            var authorFilter = new org.jboss.search.page.filter.AuthorFilter(
                searchPageElements.getAuthor_filter_body_div(),
                searchPageElements.getAuthor_filter_query_field(),
                function() {
                    goog.dom.classes.remove(searchPageElements.getDate_filter_tab_div(), org.jboss.search.Constants.SELECTED);
                    goog.dom.classes.remove(searchPageElements.getProject_filter_tab_div(), org.jboss.search.Constants.SELECTED);
                    goog.dom.classes.add(searchPageElements.getAuthor_filter_tab_div(), org.jboss.search.Constants.SELECTED);

                    goog.dom.classes.add(searchPageElements.getDate_filter_body_div(), org.jboss.search.Constants.HIDDEN);
                    goog.dom.classes.add(searchPageElements.getProject_filter_body_div(), org.jboss.search.Constants.HIDDEN);
                    goog.dom.classes.remove(searchPageElements.getAuthor_filter_body_div(), org.jboss.search.Constants.HIDDEN);

                    searchPageElements.getProject_filter_query_field().blur();
                    searchPageElements.getAuthor_filter_query_field().focus();
                },
                function() {
                    goog.dom.classes.remove(searchPageElements.getAuthor_filter_tab_div(), org.jboss.search.Constants.SELECTED);
                    goog.dom.classes.add(searchPageElements.getAuthor_filter_body_div(), org.jboss.search.Constants.HIDDEN);
                    searchPageElements.getAuthor_filter_query_field().blur();
                }
            );
            lookup_.setAuthorFilter(authorFilter);
        })
        .addCallback(function() {
            status.setProgressValue(0.33);
            asyncInit.setAuthorFilterDone();
        });

    // initialization of date filter
    dateFilterDeferred
        // first instantiate date filter and push it up into LookUp
        .addCallback(function() {
            var dateFilter = new org.jboss.search.page.filter.DateFilter(
                searchPageElements.getDate_filter_body_div(),
                searchPageElements.getDate_histogram_chart_div(),
                searchPageElements.getDate_filter_from_field(),
                searchPageElements.getDate_filter_to_field(),
                searchPageElements.getDate_order(),
                function() { return goog.dom.classes.has(searchPageElements.getDate_filter_body_div(), org.jboss.search.Constants.HIDDEN) },
                function() {
                    goog.dom.classes.add(searchPageElements.getDate_filter_tab_div(), org.jboss.search.Constants.SELECTED);
                    goog.dom.classes.remove(searchPageElements.getProject_filter_tab_div(), org.jboss.search.Constants.SELECTED);
                    goog.dom.classes.remove(searchPageElements.getAuthor_filter_tab_div(), org.jboss.search.Constants.SELECTED);

                    goog.dom.classes.remove(searchPageElements.getDate_filter_body_div(), org.jboss.search.Constants.HIDDEN);
                    goog.dom.classes.add(searchPageElements.getProject_filter_body_div(), org.jboss.search.Constants.HIDDEN);
                    goog.dom.classes.add(searchPageElements.getAuthor_filter_body_div(), org.jboss.search.Constants.HIDDEN);

                    searchPageElements.getProject_filter_query_field().blur();
                    searchPageElements.getAuthor_filter_query_field().blur();
                },
                function() {
                    goog.dom.classes.remove(searchPageElements.getDate_filter_tab_div(), org.jboss.search.Constants.SELECTED);
                    goog.dom.classes.add(searchPageElements.getDate_filter_body_div(), org.jboss.search.Constants.HIDDEN);
                    // blur not needed now
                }
            );
            lookup_.setDateFilter(dateFilter);

        })
        // second register listener on the date filter
        .addCallback(
            goog.bind(function() {
                status.setProgressValue(0.66);
                this.searchPage.registerListenerOnDateFilterChanges(lookup_.getDateFilter());
                asyncInit.setDateFilterDone();
            },this)
        );

    // fire XHR to load project list data
    lookup_.getXhrManager().send(
        org.jboss.search.Constants.LOAD_PROJECT_LIST_REQUEST_ID,
        goog.Uri.parse(org.jboss.search.Constants.API_URL_PROJECT_LIST_QUERY).toString(),
        org.jboss.search.Constants.GET,
        "", // post_data
        {}, // headers_map
        org.jboss.search.Constants.LOAD_LIST_PRIORITY,
        // callback, The only param is the event object from the COMPLETE event.
        function(e) {
            var event = /** @type goog.net.XhrManager.Event */ (e);
            if (event.target.isSuccess()) {
                var response = event.target.getResponseJson();
                projectFilterDeferred.callback(response);
            } else {
                // Project info failed to load.
                projectFilterDeferred.callback({});
            }
        }
    );

    // initialize authorFilter
    authorFilterDeferred.callback({});

    // initialize dateFilter
    dateFilterDeferred.callback({});

    // TODO experiment
    this.finish_ = goog.events.listen(this.searchPage, org.jboss.search.suggestions.event.EventType.SEARCH_FINISH, function(){
        goog.dom.classes.add(spinner_div, const_.HIDDEN);
    });

    this.start_ = goog.events.listen(this.searchPage, org.jboss.search.suggestions.event.EventType.SEARCH_START, function(){
        goog.dom.classes.remove(spinner_div, const_.HIDDEN);
    });

};
goog.inherits(org.jboss.search.App, goog.Disposable);

/** @inheritDoc */
org.jboss.search.App.prototype.disposeInternal = function() {

    // Call the superclass's disposeInternal() method.
    org.jboss.search.App.superClass_.disposeInternal.call(this);

    // Dispose of all Disposable objects owned by this class.
    goog.dispose(this.searchPage);

    // Remove listeners added by this class.
    goog.events.unlistenByKey(this.historyListenerId_);
    goog.events.unlistenByKey(this.finish_);
    goog.events.unlistenByKey(this.start_);
    goog.events.unlistenByKey(this.unloadId_);
    goog.events.unlistenByKey(this.searchEventListenerId_);

    // Remove references to COM objects.
    // Remove references to DOM nodes, which are COM objects in IE.
    // TODO ^^
};
