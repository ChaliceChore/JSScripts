// ==UserScript==
// @name         YouTube Filter: Remove Low View Count Videos
// @namespace    http://tampermonkey.net/
// @version      1.4
// @description  Hide YouTube videos with less than 1,000 views on the homepage and sidebar.
// @author       IvyOnGreasy
// @match        *://*.youtube.com/*
// @grant        none
// @license      MIT
// @downloadURL  https://update.greasyfork.org/scripts/524512/YouTube%20Filter%3A%20Remove%20Low%20View%20Count%20Videos.user.js
// @updateURL    https://update.greasyfork.org/scripts/524512/YouTube%20Filter%3A%20Remove%20Low%20View%20Count%20Videos.meta.js
// ==/UserScript==
(() => {
    "use strict";
    // Set Constants - Modify them if needed or if YouTube changes layout
    const VIEW_THRESHOLD = 1000;
    const HOME_GRID_VIDEOS_SELECTOR = "ytd-rich-item-renderer";
    const SIDEBAR_VIDEOS_SELECTOR = "yt-lockup-view-model";
    const VIEWS_ELEMENT_SELECTOR = ".yt-content-metadata-view-model__metadata-row > span.yt-content-metadata-view-model__metadata-text";


    // Parse view count text into a number
    function parseViewCount(text) {
        const match = text.match(/(\d{1,3}(?:,\d{3})*(?:\.\d+)?)\s*((?:[KMB]|lakh|crore)?)/i); // Matches view count patterns
        if (!match) return 0;

        let [, count, multiplier] = match;
        count = parseFloat(count.replace(/,/g, '')); // Remove commas and parse as float
        // TODO: Need to be fixed for languages which use comma for decimal.

        switch (multiplier?.toUpperCase()) {
            case 'K':     return count * 1000;       // Thousand multiplier
            case 'LAKH':  return count * 100000;     // Lakh multiplier
            case 'M':     return count * 1000000;    // Million multiplier
            case 'CRORE': return count * 10000000;   // Crore multiplier
            case 'B':     return count * 1000000000; // Billion multiplier
            default:      return count;              // Raw number
        }
    }

    // Check if a video has low views
    function isBadVideo(video) {
        // Get the view count element
        const viewElement = video.querySelectorAll(VIEWS_ELEMENT_SELECTOR)[1];

        // Skip items that don't have a valid view count element
        if (!viewElement || !viewElement.innerText) return false;

        // Parse the view count text
        const viewCount = parseViewCount(viewElement.innerText);

        // Return true if below threshold
        return viewCount < VIEW_THRESHOLD;
    }

    // Filter videos based on view count
    function filterVideosOnHomepageAndSidebar() {
        let videoSelectors;

        // Apply filter only on the homepage and sidebar recommendations
        if (location.pathname === "/")
            videoSelectors = HOME_GRID_VIDEOS_SELECTOR;     // Homepage grid
        else if (location.pathname.startsWith("/watch"))
            videoSelectors = SIDEBAR_VIDEOS_SELECTOR;       // Sidebar recommendations
        else
            console.log("[YT LOW VIEW COUNT] Not a Target page");

        if (!videoSelectors) return;

        const videos = document.querySelectorAll(videoSelectors);
        videos.forEach(video => {
            if (isBadVideo(video)) {
                video.style.display = "none"; // Hide videos below the view threshold
            }
        });
    }

    // Throttled MutationObserver
    let observerTimeout;
    const observerCallback = () => {
        clearTimeout(observerTimeout);
        observerTimeout = setTimeout(filterVideosOnHomepageAndSidebar, 350); // Throttle updates
    };

    const observer = new MutationObserver(observerCallback);
    observer.observe(document.body, {
        childList: true,    // Watch for added/removed child nodes
        subtree: true       // Include changes in all descendants
    });

    // Initial execution on page load
    window.addEventListener("load", filterVideosOnHomepageAndSidebar); // Run filterVideos on page load
    document.addEventListener("yt-navigate-finish", () => setTimeout(filterVideosOnHomepageAndSidebar, 350)); // Run filterVideos after YouTube navigation events
})();
