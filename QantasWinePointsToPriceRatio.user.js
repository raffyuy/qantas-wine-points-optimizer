// ==UserScript==
// @name         Qantas Wine Points-to-Price Ratio
// @namespace    http://tampermonkey.net/
// @version      2024-05-15
// @description  Show points-to-price ratio on Qantas Wine website
// @author       Rafael Uy (github.com/raffyuy)
// @match        https://wine.qantas.com/*
// @icon         https://www.google.com/s2/favicons?sz=64&domain=qantas.com
// @grant        window.onurlchange
// @require      https://ajax.googleapis.com/ajax/libs/jquery/3.6.0/jquery.min.js
// ==/UserScript==

$(document).off('DOMSubtreeModified');


(function() {
    'use strict';
    var lastProcessedUrl = '';  // Store the last URL processed

    function main() {
        console.log("Executing main functionality");

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

        lock = false;
    }

    // Function to detect when the page content has fully loaded
    function waitForContentLoad(callback) {
        console.log("waiting for content to load.")
        const observer = new MutationObserver((mutations, obs) => {
            if ($('span:contains("Earn"):contains("Bonus Points")').length > 0) {
                obs.disconnect();  // Stop observing
                console.log("content loaded, performing calculations...")
                callback();
            }
        });
        observer.observe(document, { childList: true, subtree: true });
    }


    var lock = false; // prevent from executing multiple times cause for some reason the url changes multiple times when navigating
    if (window.onurlchange === null) {
        window.addEventListener('urlchange', (info) => {
            console.log('URL changed to: ' + info.url);
            if (info.url.includes("BonusPoints") && !lock) {
                console.log("Bonus points page detected")
                waitForContentLoad(main); // Wait for content to load before executing main
            }
            lock = true;
        });
    }

})();
