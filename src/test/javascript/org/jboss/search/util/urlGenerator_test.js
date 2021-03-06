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

goog.require('org.jboss.search.util.urlGenerator');
goog.require('org.jboss.search.context.RequestParams');
goog.require('goog.Uri');
goog.require('goog.testing.jsunit');

var testSearchUrlGenerator = function() {

    var root = "http://localhost:1234";
    var url = new goog.Uri(root);
    var g_ = org.jboss.search.util.urlGenerator;

    var urlString;

    // such call should fail during compilation
    urlString = g_.searchUrl(null);
    assertEquals(
        null,
        urlString);

    // such call should fail during compilation
    urlString = g_.searchUrl(url.clone());
    assertEquals(
        [
            root,
            [
                "query",
                "field=dcp_type", "field=dcp_id", "field=dcp_title", "field=dcp_contributors", "field=dcp_project",
                "field=dcp_project_name", "field=dcp_description", "field=dcp_tags", "field=dcp_last_activity_date", "field=dcp_created", "field=dcp_url_view",
                "query_highlight=true",
                "facet=per_project_counts", "facet=per_dcp_type_counts", "facet=activity_dates_histogram"
            ].join('&')
        ].join('?'),
        urlString);

    urlString = g_.searchUrl(
        url.clone(),
        new org.jboss.search.context.RequestParams(' ')
    );
    assertEquals(
        [
            root,
            [
                "query=%20",
                "field=dcp_type", "field=dcp_id", "field=dcp_title", "field=dcp_contributors", "field=dcp_project",
                "field=dcp_project_name", "field=dcp_description", "field=dcp_tags", "field=dcp_last_activity_date", "field=dcp_created", "field=dcp_url_view",
                "query_highlight=true",
                "facet=per_project_counts", "facet=per_dcp_type_counts", "facet=activity_dates_histogram"
            ].join('&')
        ].join('?'),
        urlString);

    urlString = g_.searchUrl(
        url.clone(),
        new org.jboss.search.context.RequestParams("dummy")
    );
    assertEquals(
        [
            root,
            [
                "query=dummy",
                "field=dcp_type", "field=dcp_id", "field=dcp_title", "field=dcp_contributors", "field=dcp_project",
                "field=dcp_project_name", "field=dcp_description", "field=dcp_tags", "field=dcp_last_activity_date", "field=dcp_created", "field=dcp_url_view",
                "query_highlight=true",
                "facet=per_project_counts", "facet=per_dcp_type_counts", "facet=activity_dates_histogram"
            ].join('&')
        ].join('?'),
        urlString);

    urlString = g_.searchUrl(
        url.clone(),
        new org.jboss.search.context.RequestParams("dummy", 20)
    );
    assertEquals(
        [
            root,
            [
                "query=dummy",
                "field=dcp_type", "field=dcp_id", "field=dcp_title", "field=dcp_contributors", "field=dcp_project",
                "field=dcp_project_name", "field=dcp_description", "field=dcp_tags", "field=dcp_last_activity_date", "field=dcp_created", "field=dcp_url_view",
                "query_highlight=true",
                "facet=per_project_counts", "facet=per_dcp_type_counts", "facet=activity_dates_histogram",
                "from=190"
            ].join('&')
        ].join('?'),
        urlString);

    urlString = g_.searchUrl(
        url.clone(),
        new org.jboss.search.context.RequestParams("dummy"),
        [''], false
    );
    assertEquals(
        [
            root,
            [
                "query=dummy",
                "field",
                "query_highlight=false",
                "facet=per_project_counts", "facet=per_dcp_type_counts", "facet=activity_dates_histogram"
            ].join('&')
        ].join('?'),
        urlString);

    urlString = g_.searchUrl(
        url.clone(),
        new org.jboss.search.context.RequestParams("dummy"),
        [], false);
    assertEquals(
        [
            root,
            [
                "query=dummy",
                "query_highlight=false",
                "facet=per_project_counts", "facet=per_dcp_type_counts", "facet=activity_dates_histogram"
            ].join('&')
        ].join('?'),
        urlString);

    urlString = g_.searchUrl(
        url.clone(),
        new org.jboss.search.context.RequestParams("dummy"),
        []);
    assertEquals(
        [
            root,
            [
                "query=dummy",
                "query_highlight=true",
                "facet=per_project_counts", "facet=per_dcp_type_counts", "facet=activity_dates_histogram"
            ].join('&')
        ].join('?'),
        urlString);
};

var testProjectSuggestionsUrlGenerator = function() {

    var root = "http://localhost:1234";
    var url = new goog.Uri(root);
    var g_ = org.jboss.search.util.urlGenerator;


    var urlString;

    urlString = g_.projectNameSuggestionsUrl(null);
    assertEquals(
        null,
        urlString);

    urlString = g_.projectNameSuggestionsUrl(url.clone());
    assertEquals(
        [
            root,
            [
                "query"
            ].join('&')
        ].join('?'),
        urlString);

    urlString = g_.projectNameSuggestionsUrl(url.clone(), "test");
    assertEquals(
        [
            root,
            [
                "query=test"
            ].join('&')
        ].join('?'),
        urlString);

    urlString = g_.projectNameSuggestionsUrl(url.clone(), "test", 3);
    assertEquals(
        [
            root,
            [
                "query=test",
                "size=3"
            ].join('&')
        ].join('?'),
        urlString);

};

var testClickStreamUrlGenerator = function() {

    var root = "http://localhost:1234";
    var url = new goog.Uri(root);
    var g_ = org.jboss.search.util.urlGenerator;


    var urlString;

    urlString = g_.clickStreamUrl(null, "ignored", "ignored");
    assertEquals(
        null,
        urlString);

    urlString = g_.clickStreamUrl(url.clone(), "one", "two");
    assertEquals(
        [
            root,
            [
                "one",
                "two"
            ].join('/')
        ].join('/'),
        urlString);

    urlString = g_.clickStreamUrl(url.clone(), "one", "two", "three");
    assertEquals(
        [
            [
                root,
                [
                    "one",
                    "two"
                ].join('/')
            ].join('/'),
            "three"
        ].join('?'),
        urlString);
};
