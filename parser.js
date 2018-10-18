(function(){
	var codeInput = '';
	function getCodeFromTextArea() {
		var val = document.getElementById('code-input').value;
		codeInput = val;
	}
	
	function addClassToElement(className, element) {
		element.className += ' ' + className;
	}
	
	function getStringWithUniqueClasses(element) {
		var foundClasses = element.className.split(' ').map(item => item.trim());
		var uniqueClasses = [...new Set(foundClasses)];
		return uniqueClasses.join(' ');
	}
	
	function removeClassFromElement(className, element) {
		//Make sure the classe names are unique as replace() only replace one instance
		element.className = getStringWithUniqueClasses(element);
		element.className = element.className.replace(className, '');
	}
	
	var orientationFlipped = false;
	var orientationButton = document.getElementById('orientation-btn');
	orientationButton.addEventListener('click', function() {
		var mainArea = document.getElementsByClassName('main-area')[0];
		var buttons = mainArea.getElementsByTagName('button');
		var buttonContainer = document.getElementsByClassName('button-container')[0];
		var textAreas = document.getElementsByTagName('textarea');
		if(orientationFlipped == false){
			addClassToElement('main-area-flipped', mainArea);
			
			for (var i = 0; i < buttons.length; i++){
				addClassToElement('button-flipped', buttons[i]);
			}
			
			addClassToElement('button-container-flipped', buttonContainer);
			
			for (var i = 0; i < textAreas.length; i++){
				addClassToElement('textarea-flipped', textAreas[i]);
			}
			orientationFlipped = true;
		}
		else {
			removeClassFromElement('main-area-flipped', mainArea);
			
			for (var i = 0; i < buttons.length; i++){
				removeClassFromElement('button-flipped', buttons[i]);
			}
			removeClassFromElement('button-container-flipped', buttonContainer);
			
			for (var i = 0; i < textAreas.length; i++){
				removeClassFromElement('textarea-flipped', textAreas[i]);
			}
			orientationFlipped = false;
		}
	})
	
	var getCodeButton = document.getElementById('fix-indent-btn');
	getCodeButton.addEventListener('click', getCodeFromTextArea);
	getCodeButton.addEventListener('click', fixIndentation);
	
	var cssToSassButton = document.getElementById('css-to-sass-btn');
	cssToSassButton.addEventListener('click', getCodeFromTextArea);
	cssToSassButton.addEventListener('click', convertCssToSass);
	
	
	//=================FIX INDENTATION CODE SECTION==================//
	//(haven't supported dealing with curly brackets inside /* */ comment blocks yet)
	
	//This function count syntactically significant } & { in a line to determine
	function countIndent(line){	//whether to change the current indent level
		var indent = 0;
		var endIndex;
		var commentIndex = line.indexOf('//');
		//no comment found on this line
		if ( commentIndex === -1 ){
			endIndex = line.length;
		} else { //if commentIndex !== -1
			//For situation like this: if( currentLine.substring(0,2) !== '//' ){
			if (line[commentIndex-1] !== "'" && line[commentIndex+2] !== "'"
			&& line[commentIndex-1] !== '"' && line[commentIndex+2] !== '"'){
				endIndex = commentIndex;
			} else {
				endIndex = line.length;
			}
		}
		
		for ( var i = 0; i < endIndex; i++){ //Stop the search if encounter a comment
			//Check that the brackets are not contained in any string expression or regex
			if (line[i] === '{' && line[i-1]!="'" && line[i+1]!="'"
			&& line[i-1]!='"' && line[i+1]!='"' && line[i-1]!='/' && line[i+1]!='/'){
				indent++; //if is { , add a level of indent
			}
			else if (line[i] === '}' && line[i-1]!="'" && line[i+1]!="'"
			&& line[i-1]!='"' && line[i+1]!='"' && line[i-1]!='/' && line[i+1]!='/'){
				indent--; //if is } , remove a level of indent
			}
		}
		return indent;
	}
	
	function fixIndentation() {
		var currentIndentLevel = 0;
		var linesOfCode = codeInput.split('\n');
		var outputString = '';
		for (var i = 0; i < linesOfCode.length; i++){
			var currentLine = linesOfCode[i].trim();
			
			var actualIndentAmount;
			if (currentLine[0] === '}') {
				actualIndentAmount = currentIndentLevel - 1;
			}
			else actualIndentAmount = currentIndentLevel;
			
			for (var j = 0; j < actualIndentAmount; j++){
				outputString += '\t';
			} //After adding indentation, add the trimmed line of code then a newline
			outputString += currentLine + '\n';
			
			//Only count new indent amount on non-comment line, to add to current indent
			if( currentLine.substring(0,2) !== '//' ){
				currentIndentLevel += countIndent(currentLine);
			}
		}
		document.getElementById('code-output').innerHTML = outputString;
	}
	
	
	//=================CONVERT CSS TO SASS CODE SECTION==================//
	
	function convertCssToSass() {
		var allSelectors = {};
		var linesOfCode = codeInput.split('\n').map(item => item.trim());
		
		//The line numbers where we encounter selector combinators
		var selectorLineNums = [];
		var linesWithSelectors = [];
		for (var i = 0; i < linesOfCode.length; i++){
			var currentLine = linesOfCode[i]
			var lastCharOfCurrentLine = currentLine[currentLine.length - 1];
			if (lastCharOfCurrentLine == '{'){
				selectorLineNums.push(i);
				linesWithSelectors.push(currentLine.replace(/{/g,'').trim())
			}
		}
		selectorLineNums.push(linesOfCode.length);
		
		//ind is the index of the list containing the line numbers with selectors
		for (var ind = 0; ind < selectorLineNums.length - 1; ind++){
			var lineWithSels = linesWithSelectors[ind];
			
			var startLineToProcess = selectorLineNums[ind] + 1;
			var endLineToProcess = selectorLineNums[ind + 1] - 1;
			
			var selectorsGroupings = lineWithSels.split(',')
			.map(item => item.trim());
			
			//selectors groupings are things like header ul li, .card img
			for (var j = 0; j < selectorsGroupings.length; j++){
				var selectorsGroup = selectorsGroupings[j];
				
				//Replace multiple adjacent spaces with a single space
				var selectorFragments = selectorsGroup.replace(/  +/g, ' ').split(' ');
				
				//Assuming there is only one selector grouping if a @media tag is used
				if (selectorFragments[0] === "@media") { //use that whole selector group
					//(to be fixed)
					allSelectors[selectorsGroup] = {props:[]};
				} else {
					//The first selector piece (or the only one) in the selector grouping
					if(!allSelectors[selectorFragments[0]]){ //if it is not yet defined
						allSelectors[selectorFragments[0]] = {props:[]};
					}
					var currentSelector = allSelectors[selectorFragments[0]];
					
					for(var k = 1; k < selectorFragments.length; k ++){
						if(!currentSelector[selectorFragments[k]]){
							currentSelector[selectorFragments[k]] = {props:[]};
						}
						var currentSelector = currentSelector[selectorFragments[k]];
					}
				}
				
				//After determining what the deepest level of the selector
				// group is, we start collecting properties
				for(var m = startLineToProcess; m <= endLineToProcess; m++){
					if (linesOfCode[m] == '}') {
						continue;
					}
					var lineToStore = linesOfCode[m]
					if(lineToStore[lineToStore.length - 1] === '}'){
						lineToStore = lineToStore.replace(/}/g,'').trim();
					}
					currentSelector['props'].push(lineToStore);
				}
			}
		}
		
		var indentLevel = 0;
		var outputString = '';
		
		//-----Now write back everything as a Sass-friendly file
		//(under construction)
		console.log(allSelectors);
		document.getElementById('code-output').innerHTML =
		"This feature hasn't been finished yet, but you can open the"+
		" developer's console (assuming a CSS file was input) to see an object with"+
		" a structure resembling SASS's nested selectors structure.";
		
	} // end of convertCssToSass()
})();
