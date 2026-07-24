// ==UserScript==
// @name            GitHub Repository Active Forks
// @version         1.0
// @author          ChaliceChore
// @namespace       https://github.com/ChaliceChore/JSScripts/tree/main/Userscripts
// @description:en  Adds a button to GitHub repositories to search for their active forks on techgaun.github.io.
// @match           https://github.com/*
// @grant           none
// @icon            https://techgaun.github.io/active-forks/favicon.ico
// @run-at          document-end
// @downloadURL     https://raw.githubusercontent.com/ChaliceChore/JSScripts/refs/heads/main/Userscripts/GitHub_Repository_Active_Forks.js
// @updateURL       https://raw.githubusercontent.com/ChaliceChore/JSScripts/refs/heads/main/Userscripts/GitHub_Repository_Active_Forks.js
// @license         CC BY-NC-SA 4.0
// ==/UserScript==

(() => {
    "use strict";

    const Σ = (selector) => document.querySelector(selector);
    const TECHGAUN_FORK_URL =
        "https://techgaun.github.io/active-forks/index.html";
    const PAGEHEAD_SELECTOR      = ".pagehead-actions";  // Where Watch, Fork, Star buttons are
    const ACTIVE_FORKS_BUTTON_ID = "active-forks-btn";
    const ACTIVE_FORKS_TOOLIP_ID = "active-forks-toolip";
    const FORK_ICON_SVG = /* html */`
        <svg viewBox="0 0 256 256" width="16" height="16" class="mr-1 v-align-text-bottom" style="fill: currentColor; display: inline-block;">
            <path d="M0 0 C6.47368197 4.62235225 11.44303276 9.97008563 13 18 C13.76603353 27.26774987 13.33968888 35.71311845 7.24609375 43.13671875 C4.97438291 45.47482615 2.92764643 47.53617679 0 49 C-0.33 71.77 -0.66 94.54 -1 118 C6.26 115.36 13.52 112.72 21 110 C24.031875 108.96875 27.06375 107.9375 30.1875 106.875 C36.11405225 104.80496022 41.47372549 102.3986232 46.8984375 99.19921875 C49 98 49 98 52 97 C53.08453808 95.1492838 53.08453808 95.1492838 54 93 C54.82218416 91.72192527 55.65583944 90.45116718 56.5 89.1875 C60.75955394 82.3521096 62.2471841 74.9974073 61 67 C58.86965747 64.81088845 58.86965747 64.81088845 56 63 C49.7223261 53.98898484 48.1389919 46.97785322 49 36 C50.74885241 29.40378494 54.42103193 23.36673695 60.1796875 19.55859375 C68.12833923 14.98486136 75.26560211 13.90497595 84.40234375 15.390625 C92.07173623 17.49330554 98.52571231 22.87749529 102.5 29.75 C105.76486332 37.42318107 105.826914 45.86777021 103.0859375 53.67578125 C101.01256724 58.11339026 98.30250154 62.75656341 93.90234375 65.1328125 C90.74809909 68.22876516 90.95533007 72.18282739 90.5 76.4375 C88.15706744 94.51893265 81.87027961 108.88374796 67.7265625 120.9375 C55.07153512 130.35519479 39.8209465 135.00820499 25.05395508 140.00488281 C12.70569747 144.0222678 12.70569747 144.0222678 2.5 151.6875 C0.48378946 156.13996495 -0.86726366 160.09331914 0 165 C1.77501979 167.18061399 3.66624039 168.67174113 5.921875 170.34375 C9.93993544 173.54611396 12.04030837 177.98628391 13 183 C13.68997733 193.03120889 13.18602855 200.3676729 6.75 208.25 C1.70009357 213.68425448 -3.67705031 216.61888353 -11.1015625 217.2734375 C-20.63810565 217.54832677 -27.00878567 216.33425107 -34.28515625 210.015625 C-40.25626516 203.90363693 -42.47659116 197.88514913 -43.375 189.5 C-42.46895039 181.043537 -39.89144929 174.2371578 -34 168 C-33.31794086 167.56755132 -32.63588171 167.13510263 -31.93315411 166.68954945 C-29.81941935 165.17252777 -29.81941935 165.17252777 -29.4882555 162.8360014 C-29.48285094 161.9911358 -29.47744638 161.1462702 -29.47187805 160.27580261 C-29.45626328 159.30430771 -29.4406485 158.33281281 -29.42456055 157.33187866 C-29.42794434 156.26740509 -29.43132812 155.20293152 -29.43481445 154.10620117 C-29.4229863 152.98398666 -29.41115814 151.86177216 -29.39897156 150.70555115 C-29.36599212 146.98449311 -29.36312786 143.2641635 -29.36328125 139.54296875 C-29.35297198 136.96087848 -29.3419096 134.37879111 -29.3301239 131.79670715 C-29.31066371 126.37862458 -29.30705611 120.96082898 -29.3137207 115.54272461 C-29.3209562 109.28652964 -29.28758089 103.03146308 -29.23466331 96.77551287 C-29.18555696 90.75207132 -29.17538872 84.7292312 -29.18010521 78.70556068 C-29.17723003 76.14547345 -29.16312933 73.58537344 -29.13762856 71.02541161 C-29.10570126 67.44334732 -29.11818484 63.86405227 -29.1418457 60.28198242 C-29.12296295 59.22358154 -29.1040802 58.16518066 -29.08462524 57.07470703 C-29.0917274 51.67737168 -29.0917274 51.67737168 -31.55446434 47.06311989 C-33.3933183 45.44424058 -33.3933183 45.44424058 -35.32878399 44.16954517 C-37.70548328 42.50629089 -38.67916554 40.53947083 -39.875 37.9375 C-40.26429687 37.12152344 -40.65359375 36.30554687 -41.0546875 35.46484375 C-43.84416594 28.19145163 -43.6207204 20.97921061 -41.23046875 13.62890625 C-37.92675435 6.57049421 -31.96905271 0.28382916 -24.5859375 -2.44921875 C-16.58522532 -4.15329793 -7.17386994 -4.39438353 0 0 Z M-26 17 C-28.07398081 20.67660234 -28.51233197 23.8159556 -28 28 C-25.53614032 32.73819169 -22.84955629 35.71247345 -18 38 C-13.3932948 38.33370126 -9.99327624 37.61287257 -6.0625 35.1875 C-2.18099995 31.07075752 -1.60515038 27.69693248 -1.75 22.18359375 C-2.22580954 18.02769477 -4.00199779 15.87703224 -7.0625 13.1875 C-14.51809882 10.17353452 -20.66934111 11.00300875 -26 17 Z M65.6875 35.0625 C63.21390241 39.3683921 62.98297398 43.15594273 64 48 C66.28485553 51.97521886 68.62655429 54.54218476 73 56 C77.68953585 56.38438818 80.06443464 56.45895659 84.3125 54.375 C87.40483097 51.6422424 88.73724492 49.93682468 90 46 C90.28767252 41.06598035 89.7675754 37.94936957 86.625 34.0625 C82.5335918 30.84782213 80.29056921 29.59473607 74.9921875 29.75 C70.93034211 30.25972177 68.64802526 32.42203152 65.6875 35.0625 Z M-26.4375 182.6875 C-28.52346418 187.10974406 -28.35624096 190.34757847 -27 195 C-24.89929383 198.29110633 -23.24992205 199.8333853 -20 202 C-15.47749084 202.59022577 -11.30436029 202.52729459 -7.0625 200.8125 C-4.01780874 198.13686222 -2.3005997 195.98322488 -1.6796875 191.88671875 C-1.47406303 187.80850015 -1.82874286 185.3556879 -3.625 181.625 C-7.02535307 177.86671503 -9.9916243 176.29288812 -15 175.5625 C-20.14844085 176.31331429 -23.01406539 178.9129439 -26.4375 182.6875 Z " transform="translate(97,21)"/>
        </svg>
    `;

    const addActiveForksButton = () => {
        // 1. Remove existing button if it exists (prevents duplicates on navigation)
        const existingBtn = Σ(`#${ACTIVE_FORKS_BUTTON_ID}`);
        if (existingBtn)
            existingBtn.remove();

        // 2. Check if we are on a repository page using the meta tag
        const metaTag = Σ('meta[name="octolytics-dimension-repository_nwo"]');
        if (!metaTag)
            return;     // Not a repository page, exit

        // 3. Extract username and repository
        const [username, repository] = metaTag.content.split("/");

        // 4. Find the container to attach to
        const actionsList = Σ(PAGEHEAD_SELECTOR);
        if (!actionsList)
            return;     // If the UI hasn't rendered yet or structure changed

        // 5. Create the button list item
        const listItem = document.createElement("li");
        listItem.id = ACTIVE_FORKS_BUTTON_ID;

        // 6. Create the link formatted like a GitHub button
        const link = document.createElement("a");
        link.className = "btn btn-sm";
        link.target    = "_blank";
        link.href      = `${TECHGAUN_FORK_URL}#https://github.com/${username}/${repository}`;
        link.setAttribute("aria-label", "View Active Forks");
        link.innerHTML = `${FORK_ICON_SVG} Active Forks`;

        // 7. Create GitHub tooltip
        const toolip = document.createElement("tool-tip");
        toolip.id = ACTIVE_FORKS_TOOLIP_ID;
        toolip.setAttribute("for", ACTIVE_FORKS_BUTTON_ID);
        toolip.setAttribute("popover", "manual");
        toolip.textContent = "View active forks on techgaun.github.io";

        // 8. Append to the page
        listItem.appendChild(link);
        listItem.appendChild(toolip);
        actionsList.prepend(listItem);
    };

    // Run on Turbo navigation (GitHub's SPA transition)
    document.addEventListener("turbo:load", addActiveForksButton);

    // Fallback for older GitHub pages (just in case)
    document.addEventListener("pjax:end", addActiveForksButton);

    // Run on initial load
    addActiveForksButton();
})();
