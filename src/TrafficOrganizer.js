/* 
 * Copyright (C) 2010				Mike Sukmanowski (mike.sukmanowsky@oddinteractive.com)
*/

/* Cookie Format
	- m=[medium]|s=[source]|k=[keyword]|kg=[keywordGroup]|c=[Content]|cp=[Campaign Name]|r=[Full referrer]|rp=[Referring Path]
	
/* Formatting parameters
	%r - full referrer 		(http://www.somesite.com/path/to/page.html)
	%rd - referring domain 	(somesite.com)
	%rp - referring path	(/path/to/page.html)
	%m - medium
	%s - source
	%k - keyword
	%kg - keywordGroup
	%c - content
	%cp - campaign name

/**
 * Generates the TrafficOrganizer object with default configuration.
 * @constructor
 * @class The TrafficOrganizer class is intended to expand the functionality of Omniture's limited traffic source reporting
 * capabilities.  The class has been designed in mind for use with Omniture SiteCatalyst, but could theoretically be 
 * used for other web analytics tools.  At it's core, the TrafficOrganizer borrows heavily from Google Analytics 
 * traffic source reporting functionality but also adds a number of enhancements (e.g. referrer groups, keyword groups).
 * At it's core, the traffic source manager looks at the following dimensions to classify all incomming traffic to a web site:
 * <ul>
 *   <li>medium/channel</li>
 *	 <li>source</li>
 *   <li>keyword</li>
 *   <li>keyword group</li>
 *   <li>content</li>
 *   <li>campaign name</li>
 *   <li>referring domain</li>
 *   <li>referring path</li>
 * </ul>
 * For ease of use, traffic source manager also makes the full referrer and referring domain available.
 * @author Mike Sukmanowsky
 * @version 1.0
 */
TrafficOrganizer = function(omniObject) {
	
	TrafficOrganizer.VERSION = "1.0";
	
	var s;
	var cookieTimeout;
	var cookieName;
	
	var searchEngineList;
	
	var searchKeywordGroups;
	var referringSiteGroups;
	var ignoredReferrers;
	var ignoredSearchKeywords;
	var paidSearchParameters;
	
	var directMediumName;
	var referralMediumName;
	var organicMediumName;
	var ppcMediumName;
	
	var mediumKey;
	var medium;
	var sourceKey;
	var source;
	var contentKey;
	var content;
	var campaignKey;
	var campaign;
	var keywordKey;
	var keyword;
	var keywordGroup;
	var referrer;
	var referringDomain;
	var referringPath;
		
	var firstPageOnly;
	
	
	/**
	* Returns the current setting for how traffic source manager will behave after an initial call to 
	* {@link TrafficOrganizer#track} when session cookies are set.
	* @returns {boolean} <code>true</code> if the traffic source manager is only supposed to populate output values on the initial page
	* of the visit, <code>false</code> otherwise.
	*/
	this.getFirstPageOnly = function() {
		return firstPageOnly;
	}
	
	/**
	 * Indicates whether or not output values will be populated after the initial call to {@link TrafficOrganizer#track}.
	 * Once the session cookie has expired (after 30 minutes by default but this can be adjusted with {@link TrafficOrganizer#setCookieTimeout}
	 * ), {@link TrafficOrganizer#track} will automatically populate new values.
	 * @param {boolean} newFirstPageOnly A boolean value indicating whether or not values should be sent after initial call
	 */
	this.setFirstPageOnly = function(newFirstPageOnly) {
		firstPageOnly = newFirstPageOnly;
	}
	
	/**
	* Adds a query string parameter to be interpreted as PPC by any search engine.
	* @param {String} newPaidSearchParameter The query string variable which will be visible on all landing pages from a PPC campaign.
	*/
	this.addPaidSearchParameter = function(newPaidSearchParameter) {
		paidSearchParameters.push(newPaidSearchParameter);	
	}
	
	/**
	* Clears the list of paid search query string parameters.
	*/
	this.clearPaidSearchParameters = function() {
		paidSearchParmaeters = new Array();
	}
	
	/**
	* Adds a user-defined search engine to the default search engine list.
	* @param {String} newSearchEngineDomain the top-level-domain of the new search engine (e.g. "google.com").  This value does not
	* have to correspond precisely to a domain and can instead contain a portion of the domain if there are many exceptions (e.g. "google").
	* @param {String} newSearchEngineKeywordKey the query string variable where the search engine populates the search term.
	* @param {String} newSearchEngineName the name of the search engine which will appear in reporting.
	*/
	this.addSearchEngine = function(newSearchEngineDomain, newSearchEngineKeywordKey, newSearchEngineName) {
		searchEngineList.push([newSearchEngineDomain, newSearchEngineKeywordKey, newSearchEngineName]);
	}
	
	/**
	* Used to classify a group of referring domains.
	* @param {String} domainList a comma-separated list of the top-level referring domains belonging to this group.
	* @param {String} groupMedium the corresponding medium/channel of the group.
	* @param {String} groupSource the corresponding source of the group.
	*/
	this.addReferrerGroup = function(domainList, groupMedium, groupSource) {
		referringSiteGroups.push([domainList, groupMedium, groupSource]);	
	}
	
	/**
	* Clears all groups of referring domains that have been added.
	*/
	this.clearAllReferrerGroups = function() {
		referringSiteGroups = new Array();	
	}
	
	/**
	* Used to classify a group of search keywords (organic or paid).
	* @param {String} keywordList a comma-separated list of keywords that belong in this group.
	* @param {String} groupName the name of the group.
	*/
	this.addSearchKeywordGroup = function(keywordList, groupName) {
		searchKeywordGroups.push([keywordList, groupName]);
	}
	
	/** 
	* Clears all search keyword groups.
	*/
	this.clearAllSearchKeywordGroups = function() {
		searchKeywordGroups = new Array();
	}
	
	/** 
	* Adds an referring domain to be treated as "direct" traffic.  Domains added to this list will also cause the TrafficOrganizer
	* to avoid overwriting the session cookie.
	* @param {String,RegExp} referrerToIgnore can either be a {@link String} or a {@link RegExp}
	*/
	this.addIgnoredReferrer = function(referrerToIgnore) {
		ignoredReferrers.push(referrerToIgnore);
	}
	
	/** 
	* Clears the current list of referring domains to be treated as direct traffic.
	*/
	this.clearIgnoredReferrers = function() {
		ignoredReferrers = new Array();
	}
	
	/**
	* Adds an organic search keyword to be treated as though it were direct traffic.
	* @param {String,RegExp} keywordToIgnore can be either a {@link String} or a {@link RegExp}.
	*/
	this.addIgnoredSearchKeyword = function(keywordToIgnore) {
		ignoredSearchKeywords.push(keywordToIgnore);
	}
	
	/**
	* Clears all organic search keywords that are to be treated as direct traffic.
	*/
	this.clearIgnoredSearchKeywords = function() {
		ignoredSearchKeywords = new Array();
	}
	
	/**
	* Returns the medium once {@link TrafficOrganizer#track} is called.  Calling prior to {@link TrafficOrganizer#track}
	* will return a blank value (i.e. "").
	* @returns {String} the medium.
	*/
	this.getMedium = function() {
		return medium;
	}
	
	/**
	* Returns the source once {@link TrafficOrganizer#track} is called.  Calling prior to {@link TrafficOrganizer#track}
	* will return a blank value (i.e. "").
	* @returns {String} the source.
	*/	
	this.getSource = function() {
		return source;
	}
	
	/**
	* Returns the content once {@link TrafficOrganizer#track} is called.  Calling prior to {@link TrafficOrganizer#track}
	* will return a blank value (i.e. "").
	* @returns {String} the content.
	*/
	this.getContent = function() {
		return content;
	}
	
	/**
	* Returns the keyword once {@link TrafficOrganizer#track} is called.  Calling prior to {@link TrafficOrganizer#track}
	* will return a blank value (i.e. "").
	* @returns {String} the keyword.
	*/
	this.getKeyword = function() {
		return keyword;
	}
	
	/**
	* Returns the keyword group once {@link TrafficOrganizer#track} is called.  Calling prior to {@link TrafficOrganizer#track}
	* will return a blank value (i.e. "").
	* @returns {String} the keyword group.
	*/
	this.getKeywordGroup = function() {
		return keywordGroup;	
	}
	
	/**
	* Returns the campaign once {@link TrafficOrganizer#track} is called.  Calling prior to {@link TrafficOrganizer#track}
	* will return a blank value (i.e. "").
	* @returns {String} the campaign.
	*/
	this.getCampaign = function() {
		return campaign;
	}
	
	/**
	* Returns the referring domain path component of the URI once {@link TrafficOrganizer#track} is called.
	* @returns {String} the path of the most recent referring URI.  Calling prior will return a blank value (i.e. "").  If traffic was direct, this value will be blank.
	*/
	this.getReferringPath = function() {
		return referringPath;	
	}
	
	// Returns the full referrer (document.referrer) once {@link TrafficOrganizer#track} is called.  Calling prior to {@link TrafficOrganizer#track}
	// will return a blank value (i.e. "").
	// @returns {String} the full referrer (document.referrer).
	// @deprecated
	/*
	this.getReferrer = function() {
		return referrer;	
	}*/
	
	/**
	* Returns the referring domain once {@link TrafficOrganizer#track} is called.  Calling prior to {@link TrafficOrganizer#track}
	* will return a blank value (i.e. "").
	* @returns {String} the referring domain.
	*/
	this.getReferringDomain = function() {
		return referringDomain;	
	}
	
	/**
	* Sets the query string parameter that {@link TrafficOrganizer#track} will use to populate the medium if present.
	* @param {String} newMediumKey the name of the new query string parameter to use (default is utm_medium).
	*/
	this.setMediumKeyName = function(newMediumKey) {
		mediumKey = newMediumKey;
	}
	
	/**
	* Sets the query string parameter that {@link TrafficOrganizer#track} will use to populate the source if present.
	* @param {String} newSourceKey the name of the new query string parameter to use (default is utm_source).
	*/	
	this.setSourceKey = function(newSourceKey) {
		sourceKey = newSourceKey;
	}
	
	/**
	* Sets the query string parameter that {@link TrafficOrganizer#track} will use to populate the content if present.
	* @param {String} newContentKey the name of the new query string parameter to use (default is utm_content).
	*/
	this.setContentKey = function(newContentKey) {
		contentKey = newContentKey;	
	}
	
	/**
	* Sets the query string parameter that {@link TrafficOrganizer#track} will use to populate the keyword if present.
	* @param {String} newKeywordKey the name of the new query string parameter to use (default is utm_term).
	*/
	this.setKeywordKey = function(newKeywordKey) {
		keywordKey = newKeywordKey;
	}
	
	/**
	* Sets the query string parameter that {@link TrafficOrganizer#track} will use to populate the keyword if present.
	* @param {String} newKeywordKey the name of the new query string parameter to use (default is utm_term).
	*/
	this.setCampaignKey = function(newCampaignKey) {
		campaignKey = newCampaignKey;
	}
	
	/**
	* Sets the cookie name to use when storing the function.  Please note that all cookies are stored using Omniture's s.c_w function.
	* @param {String} newCookieName the new name to use for the traffic source manager cookie.
	*/
	this.setCookieName = function(newCookieName) {
		cookieName = newCookieName;	
	}
	
	/** 
	* Returns the current cookie name that will be used to store traffic source data.
	* @returns {String} the current cookie name.
	*/
	this.getCookieName = function() {
		return cookieName;
	}
	
	/**
	* Sets the cookie timeout to use.  The default is 30 mins (which is the standard definition of a visit).
	* @param {int} newCookieTimeout the new timeout value to use measured in milliseconds (e.g. 1800000 ms = 30 mins).
	*/
	this.setCookieTimeout = function(newCookieTimeout) {
		cookieTimeout = newCookieTimeout;	
	}
	
	/** 
	* Returns the current cookie timeout.
	* @returns {int} the current cookie timeout measured in milliseconds.
	*/
	this.getCookieTimeout = function() {
		return cookieTimeout;
	}
	
	/** 
	* Returns the name to be used for the medium output parameter in the event of direct traffic.
	* @returns {String} the medium value used for direct traffic (default is "Direct (Brand Aware) / Bookmarked / Continued Session").
	*/
	this.getDirectMediumName = function() {
		return directMediumName;
	}
	
	/**
	* Sets the name to be used for the medium output parameter in the event of direct traffic.
	* @param {String} newMediumName the new value to use for medium in the event of direct traffic (default is "Direct (Brand Aware) / Bookmarked / Continued Session").
	*/
	this.setDirectMediumName = function(newMediumName) {
		directMediumName = newMediumName;
	}
	
	/**
	* Returns the name to be used for the medium output parameter in the event of organic referral traffic.
	* @returns {String} the medium value used for organic referral traffic (default is "Referrer: Organic").
	*/
	this.getReferralMediumName = function() {
		return referralMediumName;	
	}
	
	/**
	* Sets the name to be used for the medium in the event of organic referral traffic.
	*/ 
	this.setReferralMediumName = function(newMediumName) {
		referralMediumName = newMediumName;
	}
	
	/**
	* Returns the name to be used for the medium output parameter in the event of organic search traffic.
	* @returns {String} the medium value used for organic search traffic (default is "Search Engine: Organic").
	*/
	this.getOrganicMediumName = function() {
		return organicMediumName;
	}
	
	/**
	* Sets the name to be used for the medium in the event of organic search traffic.
	* @param {String} newMediumName the name to be used for organic search traffic.
	*/ 
	this.setOrganicMediumName = function(newMediumName) {
		organicMediumName = newMediumName;
	}
	
	/**
	* Returns the name to be used for the medium output parameter in the event of paid search traffic.
	* @returns {String} the medium value used for paid search traffic (default is "Search Engine: Paid").  Traffic is considered paid when a paid
	* search query string parmaeter is detected.
	* @see TrafficOrganizer#addPaidSearchParameter
	*/
	this.getPPCMediumName = function() {
		return ppcMediumName;	
	}
	
	/**
	* Sets the name to be used for the medium in the event of organic search traffic.
	* @param {String} newMediumName the name to be used for paid search traffic.
	* @see TrafficOrganizer#addPaidSearchParameter
	*/ 
	this.setPPCMediumName = function(newMediumName) {
		ppcMediumName = newMediumName;
	}
	
	/**
	* Resets all the values that the traffic sources manager expects for query string parameters to identify a proper medium, source, campaign,
	* keyword and content.
	*/
	this.resetKeys = function() {
		mediumKey = "utm_medium";
		sourceKey = "utm_source";
		campaignKey = "utm_campaign";
		keywordKey = "utm_term";
		contentKey = "utm_content";
	}
	
	/**
	* Resets ALL values to their initial values.  This will overwrite: cookie timeout, cookie name, search keyword groups, referring site groups,
	* ignored keyword lists, paid search keyword lists, direct channel names, referral channel names, organic channel names and ppc channel names.
	*/
	this.resetAll = function() {
		this.resetKeys();
		
		cookieTimeout 			= 1800000;	// 30 minutes
		cookieName 				= "_tsm";
		
		medium 					= "";
		source					= "";
		campaign				= "";
		keywordGroup			= "";
		content					= "";
		referrer				= document.referrer;
		referringDomain			= getDomainFromURI(referrer);
		referringPath			= getPathFromURI(referrer);
		
		searchKeywordGroups 	= new Array();
		referringSiteGroups 	= new Array();
		ignoredReferrers		= new Array();
		ignoredSearchKeywords 	= new Array();	
		paidSearchParameters	= new Array();
		
		ignoredReferrers.push(getDomainFromURI(document.location.href.toLowerCase()));
		
		directMediumName 		= "Direct / Brand Aware: Typed / Bookmarked / etc";
		referralMediumName 		= "Referrer: Organic";
		organicMediumName		= "Search Engine: Organic";
		ppcMediumName			= "Search Engine: Paid";
		
		firstPageOnly			= true;
	}
	
	/**
	* The core function of the traffic source manager class intended to be used after an instance is initialized and configured.
	* The logic of this function is somewhat complex: <br/>
	* <ol>
	*	<li>If no traffic source cookie is found, the traffic source will be classified.</li>
	*	<li>If a traffic source cookie is found, it may be overwritten if and only if:</li>
	*	<ol>
	*		<li>The referrer of the current page does not match the list of ignored referrers OR </li>
	*		<li>The medium and source query string parameters are present and have values set</li>
	*	</ol>
	* </ol>
	*/
	this.track = function() {
		var overwrite = false;
		
		if (!isCookieSet()) {
			overwrite = true;	
		} else {
			// Conditions for overwriting the cookie are as follows:
			//   - If the previous referring domain is not one of our ignored referrers, overwrite
			//   - If the medium and source query string parameters are found, overwrite
			var src = s.getQueryParam(sourceKey);
			var med = s.getQueryParam(mediumKey);
			if ( 	(document.referrer != "" && inArray(referringDomain, ignoredReferrers) == -1) ||
					(src != "" && med != "") ) {
				overwrite = true;	
			}
		}
		
		if (overwrite) {
			classifyTrafficSource();
			saveValuesToCookie();
		} else {
			getValuesFromCookie();
			if (firstPageOnly) {
				clearOutputValues();
			}
		}
	}
	
	/**
	* Used solely by the {@link TrafficOrganizer#track} function and will attempt to classify incomming traffic.
	* Classification works as follows:
	* <ol>
	*	<li>Attempt to use query string parameters first if present</li>
	*	<li>If query string parameters aren't present, determine if traffic is direct (no referrer)</li>
	*	<li>If traffic is not direct, attempt to classify as search engine</li>
	*	<li>If not search, classify using referring site groups or as a regular referrer</li>
	* </ol>
	* @returns will populate a medium and source at a minimum and possibly other variables if possible.
	* @private
	*/
	function classifyTrafficSource() {
		medium = s.getQueryParam(mediumKey);
		source = s.getQueryParam(sourceKey);
		campaign = s.getQueryParam(campaignKey);
		content = s.getQueryParam(contentKey);
		keyword = s.getQueryParam(keywordKey);
		keywordGroup = "";
		
		if (source == "" || medium == "") {
			medium = "";
			source = "";
			campaign = "";
			content = "";
			keyword = "";
			keywordGroup = "";
			
			// Link is not tagged check to see if direct
			if (referrer == "") {
				medium = directMediumName;
				source = "(none)";
			} else {
				if (!checkSearchEngine()) {
					if (!checkReferringSiteGroups()) {
						medium = referralMediumName;
						source = referringDomain;	
					}
				}
			}
		} 
	}
	
	/**
	*
	* @private
	*/
	function clearOutputValues() {
		medium = "";
		source = "";
		campaign = "";
		content = "";
		keyword = "";
		keywordGroup = "";
		referringDomain = "";
		referringPath = "";
	}
	
	/**
	*
	* @private
	*/	
	function checkReferringSiteGroups() {
		
		if (inArray(referringDomain, ignoredReferrers) >= 0) {
			medium = directMediumName;
			source = referringDomain;
			return true;
		}
		
		for (var i = 0; i < referringSiteGroups.length; i++) {
			if( inArray(referringDomain, referringSiteGroups[i][0]) >= 0) {
				medium = referringSiteGroups[i][1];
				source = formatString(referringSiteGroups[i][2]);
				return true;
			}
		}
		
		return false;
	}
	
	/**
	* Checks to determine whether the active referrer is a search engine and populates appropriate variables.
	* @returns {boolean} true if it is determined to be a search engine, false otherwise.  If referrer is a search engine, this function also populates:
	* <ul>
	*   <li>Source</li>
	*   <li>Medium</li>
	*   <li>Keyword</li>
	*   <li>Keyword Group (optional)</li>
	* </ul>
	* @private
	*/
	function checkSearchEngine() {
		var engineFound = false;
		
		for (var i = 0; (i < searchEngineList.length) && !engineFound; i++) {
			if (referringDomain.indexOf(searchEngineList[i][0]) >= 0) {
				engineFound = true;
				
				// Need to check for paid search
				var isPaid = false;
				for (var j = 0; (j < paidSearchParameters.length) && !isPaid; j++) {
					if (s.getQueryParam(paidSearchParameters[j]) != "") {
						isPaid = true;
					} 
				}
				
				medium = isPaid ? ppcMediumName : organicMediumName;
				source = searchEngineList[i][2];
				keyword = s.getQueryParam(searchEngineList[i][1],'',referrer).toLowerCase();
				keyword = keyword.toLowerCase();
				
				var ignoredKeywordFound = false;
				for (var j = 0; (j < ignoredSearchKeywords.length) && !ignoredKeywordFound && !isPaid; j++) {
					if (typeof(ignoredSearchKeywords[j]) == "string") {
						ignoredKeywordFound = keyword == ignoredSearchKeywords[j];
					} else if (typeof(ignoredSearchKeywords[j]) == "object" && ignoredSearchKeywords[j].test) {
						ignoredKeywordFound = ignoredSearchKeywords[j].test(keyword);	
					}
				}
				if (ignoredKeywordFound && !isPaid) medium = directMediumName;
					
				if (!ignoredKeywordFound) {
					var groupFound = false;
					for (var j = 0; (j < searchKeywordGroups.length) && !groupFound; j++) {
						if (typeof(searchKeywordGroups[j][0]) == "string") {
							groupFound = (searchKeywordGroups[j][0].indexOf(keyword) >= 0);					
						} else if (typeof(searchKeywordGroups[j][0]) == "object" && searchKeywordGroups[j][0].test) {
							groupFound = searchKeywordGroups[j][0].test(keyword);	
						}
						if (groupFound) keywordGroup = searchKeywordGroups[j][1];
					}
				} else {
					keywordGroup = "Brand Aware Keywords / Direct Traffic";
				}
			}
		}
		
		return engineFound;
	}
	
	/**
	*
	* @private
	*/
	function getDomainFromURI(uri) {
		var rd = "";
		
		if (uri) {
			var domainBegin = uri.indexOf("//");
			var domainEnd = uri.indexOf("/", domainBegin+2);
			rd = uri.substring(domainBegin+2, domainEnd);
			rd = rd.replace("www.","");
		}
		
		return rd;
	}
	
	/**
	* @private
	*/
	function getPathFromURI(uri) {
		var path = "";
		
		if (uri) {
			var pathBegin = uri.indexOf("//");
			pathBegin = uri.indexOf("/", pathBegin+2);
			var pathEnd = uri.indexOf("?", pathBegin) >= 0 ? uri.indexOf("?", pathBegin) : uri.length;
			
			path = uri.substring(pathBegin, pathEnd);
		}
		
		return path;
	}
	
	/**
	*
	* @private
	*/	
	function formatString(string) {
		var str = string;
		
		str = str.replace(/\%rd/g, referringDomain);
		str = str.replace(/\%rp/g, referringPath);
		//str = str.replace(/\%r/g, referrer);
		str = str.replace(/\%m/g, medium);
		str = str.replace(/\%s/g, source);
		str = str.replace(/\%cp/g, campaign);
		str = str.replace(/\%c/g, content);
		str = str.replace(/\%kg/g, keywordGroup);
		str = str.replace(/\%k/g, keyword);
		
		return str;
	}

	/**
	* @private
	*/
	function isCookieSet() {
		return (s.c_r(cookieName) ? true : false);
	}
	/**
	*
	* @private
	*/
	function getValuesFromCookie() {
		//var str = getCookie(cookieName);
		var str = s.c_r(cookieName);
		
		if (!str) {
			return false;
		} else {
			str = str.split("|");
			for (var i = 0; i < str.length; i++) {
				var key = str[i].split("=")[0];
				var value = unescapeValue(str[i].split("=")[1]);
				
				switch(key) {
					case "m" :
					medium = value;
					break;
					
					case "s" :
					source = value;
					break;
					
					case "k" :
					keyword = value;
					break;
					
					case "kg" :
					keywordGroup = value;
					break;
					
					case "c" :
					content = value;
					break;
					
					case "cp" :
					campaign = value;
					break;
					
					/*
					case "r" :
					referrer = value;
					break;
					*/
					
					case "rp" :
					referringPath = value;
					break;
					
					case "rd" :
					referringDomain = value;
					break;
				}
			}
			return true;
		}	
	}
	
	/**
	*
	* @private
	*/	
	function saveValuesToCookie() {
		var str = "";
		
		str += "m="+escapeValue(medium);
		str += "|s="+escapeValue(source);
		if (keyword) {
			str += "|k="+escapeValue(keyword);
		}
		
		if (keywordGroup) {
			str += "|kg="+escapeValue(keywordGroup);
		}
		
		if (content) {
			str += "|c="+escapeValue(content);
		}
		
		if (campaign) {
			str += "|cp="+escapeValue(campaign);
		}
		
		/*
		if (referrer) {
			str += "|r="+escapeValue(referrer);
		}
		*/
		
		if(referringPath) {
			str += "|rp="+escapeValue(referringPath);
		}
		
		if (referringDomain) {
			str += "|rd="+escapeValue(referringDomain);
		}
		
		var d = new Date();
		// Delete the current cookie
		d.setTime(d.getTime() - 1*24*60*60*1000);
		s.c_w(cookieName, "", d);
		d = new Date();
		// Now write the cookie value again
		d.setTime(d.getTime() + cookieTimeout);
		s.c_w(cookieName, str, d);
		//setCookie(cookieName, str, cookieTimeout);
	}
	
	/**
	*
	* @private
	*/	
	function escapeValue(value) {
		value = value.replace("|", "~!~");
		value = encodeURIComponent(value);
		return value;
	}
	
	/**
	*
	* @private
	*/	
	function unescapeValue(value) {
		value = decodeURIComponent(value);
		value = value.replace("~!~","|");
		return value;
	}
	
	/**
	* Similar to JavaScript's native .indexOf() method.  Supports arrays which contain a collection of {@link RegExp} objects.
	* @param {value} the value to search for in the array
	* @param {array} the array to search in for value
	* @returns the index of value in array
	* @private
	*/
	function inArray(value, array, useIndexOf) {
		if (useIndexOf === undefined) {
			useIndexOf = false;
		}
		
		if (array.indexOf && typeof(array) == "string") {
			return array.indexOf(value);
		}
		
		for (var i = 0; i < array.length; i++) {
			if (array[i].test) {
				if (array[i].test(value)) {
					return i;
				}
			} else {
				if (useIndexOf) {
					if (array[i].indexOf(value) >= 0) {
						return i;
					}
				} else {
					if (array[i] === value) {
						return i;
					}
				}
			}
		}
		return -1;
	}
	
	searchEngineList = new Array(
		["daum", "q", "Daum"],
		["eniro", "search_word", "Eniro"],
		["naver", "query", "Naver"],
		["google", "q", "Google"],
		["yahoo", "p", "Yahoo"],
		["msn", "q", "MSN"],
		["bing", "q", "Bing"],
		["aol", "query,encquery", "AOL"],
		["lycos", "query", "Lycos"],
		["ask", "q", "Ask"],
		["altavista", "q", "Altavista"],
		["search.netscape", "query", "Netscape"],
		["cnn", "query", "CNN"],
		["about", "terms", "About"],
		["mamma", "query", "Mamma"],
		["alltheweb", "q", "Alltheweb"],
		["voila.fr", "rdata", "Voila"],
		["virgilio", "qs", "Virgilio"],
		["baidu", "wd", "Baidu"],
		["alice", "qs", "Alice"],
		["yandex", "text", "Yandex"],
		["najdi.org.mk", "q", "Najdi"],
		["seznam.cz", "q", "Seznam"],
		["search.com", "q", "Search.com"],
		["wp.pl", "szukaj", "Wirtulana Polska"],
		["onetcenter", "qt", "O*NET"],
		["szukacz", "q", "Szukacz"],
		["yam", "k", "Yam"],
		["pchome", "q", "PCHome"],
		["kvasir", "q", "Kvasir"],
		["sesam", "q", "Sesam"],
		["ozu", "q", "Ozu"],
		["terra", "query", "Terra"],
		["mynet", "q", "Mynet"],
		["ekolay", "q", "Ekolay"],
		["rambler", "words", "Rambler"]
	);	
	s = omniObject;
	this.resetAll();
}