// ==UserScript==
// @name         Qantas Wine Points-to-Price Ratio
// @namespace    http://tampermonkey.net/
// @version      2023-12-09
// @description  Show points-to-price ratio on Qantas Wine website
// @author       Codey Couture
// @match        https://wine.qantas.com/*
// @icon         https://www.google.com/s2/favicons?sz=64&domain=qantas.com
// @grant        none
// @require      https://ajax.googleapis.com/ajax/libs/jquery/3.6.0/jquery.min.js
// ==/UserScript==

$(document).off('DOMSubtreeModified');


(function() {
    'use strict';
    var lastProcessedUrl = '';  // Store the last URL processed

    function main() {
        if ($("#__next").hasClass("processed")) {
            console.log("Skipping execution because #__next is already processed.");
            return;
        }

        console.log("Executing main functionality because URL contains 'BonusPoints'");

        // Collect all product cards along with their ratios
        var productsWithRatios = [];
        $("span:contains('Earn'):contains('Bonus Points')").closest('div').each(function() {
            var productCard = $(this);
            var bonusPointsText = productCard.find("span:contains('Bonus Points')").text();
            var priceContainer = productCard.find('a').last().children('div').last();
            var prices = priceContainer.find('div').text();

            // Regex to find bonus points and prices
            var bonusPointsMatch = bonusPointsText.match(/(\d{1,3}(,\d{3})*|\d+)(?=\s*Bonus Points)/);
            var priceMatch = prices.match(/(\$[0-9,]+\.\d{2})/g);

            if (bonusPointsMatch && priceMatch) {
                var bonusPoints = parseInt(bonusPointsMatch[0].replace(/,/g, ''));
                var effectivePrice = parseFloat(priceMatch[priceMatch.length - 2].replace(/[,$]/g, '')); // Assuming second last is the right price
                var ratio = bonusPoints / effectivePrice;

                // Create ratio display element
                var ratioDisplay = $('<div>').text(`Points/Price: ${ratio.toFixed(2)}`)
                ratioDisplay.css({
                    backgroundColor: '#ffcc00',
                    color: 'black',
                    padding: '5px',
                    borderRadius: '5px',
                    textAlign: 'left',
                    fontWeight: 'bold',
                    fontSize: '0.9em',
                    position: 'relative',
                    //top: '0px',
                    //left: '0px',
                    zIndex: '1000'
                });

                // Add ratioDisplay to the product card
                //productCard.prepend(ratioDisplay);

                productCard.find('h4').first().parent().prepend(ratioDisplay);

                // Push to the array for sorting later
                productsWithRatios.push({ element: productCard, ratio: ratio });
            }
        });

        // Sort product cards by the ratio
        productsWithRatios.sort(function(a, b) {
            return b.ratio - a.ratio;
        });

        // Get the parent container that holds all product cards
        var productContainer = $("span:contains('Earn'):contains('Bonus Points')").closest('div').parent();

        // Clear the container before reinserting sorted cards
        productContainer.empty();

        // Append product cards back into the DOM in sorted order
        $.each(productsWithRatios, function(index, productWithRatio) {
            productContainer.append(productWithRatio.element);
        });

        // Optionally, you can highlight the product with the highest ratio
        if (productsWithRatios.length > 0) {
            $(productsWithRatios[0].element).css({
                border: '2px solid gold',
                boxShadow: '0 0 10px 3px gold'
            });
        }

        // Mark the #__next element as processed
        $("#__next").addClass("processed");
        lastProcessedUrl = window.location.href;  // Update the last processed URL

    }



    // Check if 'BonusPoints' is in the URL and execute main if it is
    function checkAndExecute() {
        if (window.location.search.indexOf('BonusPoints') > -1 && (!$("#__next").hasClass("processed") || lastProcessedUrl !== window.location.href)) {
            $("#__next").removeClass("processed");  // Remove processed class if URL has changed significantly
            main();
        } else {
            console.log("URL does not contain 'BonusPoints' or has already been processed.");
        }
    }

    function add_sorting_listener() {
        var sortField = document.getElementById('sortField'); // Assuming this is the ID of your sorting button
        function handleChange() {
            console.log("Detected change in sorting option. Executing script...");
            setTimeout(function() {
                main();
            }, 1000);
        }
        // Check initial state and setup observer if element exists
        if (sortField) {
            // Create an observer instance linked to the callback function
            var observer = new MutationObserver(function(mutations) {
                mutations.forEach(function(mutation) {
                    if (mutation.type === 'attributes' && mutation.attributeName === 'value') {
                        console.log("Value changed to: ", sortField.getAttribute('value'));
                        handleChange();
                    }
                });
            });

            // Configuration of the observer:
            var config = { attributes: true, attributeOldValue: true };

            // Start observing the target element for configured mutations
            observer.observe(sortField, config);
        } else {
            console.warn('SortField element not found on the page.');
        }
    }

    // Observer for DOM changes when going to new page
    const observer = new MutationObserver(mutations => {
        mutations.forEach(mutation => {
            if ((mutation.type === 'childList' || mutation.type === 'attributes') &&
                !$("#__next").hasClass("processed")) {
                checkAndExecute();
                add_sorting_listener();
            }
        });
    });

    // Start observing the __next element for changes in the DOM
    const config = { attributes: true, childList: true, subtree: true };
    const targetNode = document.getElementById('__next');
    if (targetNode) {
        observer.observe(targetNode, config);
    } else {
        console.warn('The #__next element does not exist on the page.');
    }

    // Also run check on initial load
    checkAndExecute();


})();
