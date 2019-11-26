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
	
	//Input and output will have been saved if the Fix Indent button was pressed
	var savedCodeInput = localStorage.getItem('codeInput');
	document.getElementById('code-input').innerHTML = savedCodeInput;
	var savedCodeOutput = localStorage.getItem('codeOutput');
	document.getElementById('code-output').innerHTML = savedCodeOutput;
	//Also get the previously saved value in the 'Indent by' box
	var indentByValue = localStorage.getItem('indentBy');
	if (indentByValue === null) { //default to 1 tab if no value saved
		document.getElementById('indent-by').value = '1 tab';
	} else {
		document.getElementById('indent-by').value = indentByValue;
	}
	
	var layoutFlippedString = localStorage.getItem('layoutFlipped');
	if (layoutFlippedString === 'true'){
		layoutFlipped = true;
	}
	else if (layoutFlippedString === 'false'){
		layoutFlipped = false;
	}
	
	// If data about the layout being flipped from last time is unavailable
	if (layoutFlippedString === null){
		layoutFlipped = false; //set to default value
	}
	if (layoutFlipped === true){
		//flipLayoutOrientation(false) will flip the orientation and return true
		layoutFlipped === flipLayoutOrientation(!layoutFlipped);
	}
	
	var orientationButton = document.getElementById('orientation-btn');
	orientationButton.addEventListener('click', function() {
		layoutFlipped = flipLayoutOrientation(layoutFlipped);
	})
	
	function flipLayoutOrientation(isFlipped){
		var mainArea = document.getElementsByClassName('main-area')[0];
		var buttons = mainArea.getElementsByTagName('button');
		var buttonContainer = document.getElementsByClassName('button-container')[0];
		var textAreas = document.getElementsByTagName('textarea');
		
		if(isFlipped == false){
			addClassToElement('main-area-flipped', mainArea);
			for (var i = 0; i < buttons.length; i++){
				addClassToElement('button-flipped', buttons[i]);
			}
			addClassToElement('button-container-flipped', buttonContainer);
			for (var i = 0; i < textAreas.length; i++){
				addClassToElement('textarea-flipped', textAreas[i]);
			}
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
		}
		
		localStorage.setItem('layoutFlipped', !isFlipped);
		return !isFlipped;
	}
	
	var getCodeButton = document.getElementById('fix-indent-btn');
	getCodeButton.addEventListener('click', function(){
		getCodeFromTextArea();
		fixIndentation();
	});
	
	//Helper function to check if forward slash is part of a disivion (e.g. (50*5)/6)
	function isTheSlashADivisionAt(index, currLine) { //(curr is short for current)
		//start at the given index, moving backward in currLine, if encounter space(s) or
		// ')', continue, if encounter a number, stops and return true; else return false
		var currInd = index - 1;
		while(currInd >= 0) {
			//If encounter +, (, =, ?, we know that the / is part of a regex (=/= division)
			if (currLine[currInd] == '+' || currLine[currInd] == '(' ||
			currLine[currInd] == '=' || currLine[currInd] == '?'){
				return false; // therefore we return false
			}

			if (currLine[currInd] == ' ' || currLine[currInd] == ')') {
				currInd--;
				continue;
			}
			//if encounter a number, a letter or an underscore character (all of which can
			// be in a variable name), the forward slash is considered part of a division
			else if ( (currLine[currInd] >= 'a' && currLine[currInd] <= 'z') || 
			(currLine[currInd] >= 'A' && currLine[currInd] <= 'Z') || 
			(currLine[currInd] >= '0' && currLine[currInd] <= '9') || 
			currLine[currInd] == '_' ){
				return true;
			}				
			else { //if not ' ', ')' or any above case, '/' is not part of a division
				return false;
			}
		}
		return false;
	}
	
	//check to see if there is an even number of \ before a char inside a regex
	// -inside a regex, \\\\] means \\] and \] means we escape the end square bracket
	// -same thing with /, \/ means we escape the end of the regex to get a /
	function evenNumberOfBackSlashesBefore(index, currLine) {
		var currInd = index - 1;
		var count = 0;
		while(currLine[currInd] === '\\') {
			count++;
			currInd--;
		}
		if (count % 2 === 0) return true;
		else return false;
	}
	
	//=================FIX INDENTATION CODE SECTION==================//
	// Remove comments, regex and contents inside quotes before counting the brackets
	function getProcessedLinesOfCode(){
		var insideSingleQuotes = false;
		var insideDoubleQuotes = false;
		var insideSingleLineComment = false;
		var insideMultiLineComment = false;
		var insideLiteralRegex = false;
		var insideSquareBrackets = false;
		
		var skipAnIteration = 0;
		
		var processedLineChars = [];
		var processedLinesOfCode = [];
		var linesOfCode = codeInput.split('\n');
		
		//Note: This loop assumes that the syntax of the provided CSS/JS code is correct
		for (var i = 0; i < linesOfCode.length; i++){
			
			insideSingleLineComment = false; //new line -> no more in a single line comment
			processedLineChars = []; //reset array containing chars of the current line
			var currentLine = linesOfCode[i].trim();

			// '//' in an import statement will sometimes mess things up, for example:
			// @import url(https://fonts.googleapis.com/css?family=Nunito);/*!
			if (currentLine.substring(0, 7) == '@import'){ //if we see @import statement,
				currentLine = // create a new line of code that has it removed
					currentLine.substring(currentLine.indexOf(';'), currentLine.length);
			}

			for (var j = 0; j < currentLine.length; j++){
				if (skipAnIteration){
					skipAnIteration = false;
					continue;
				}
				//if inside a code section to skip over when evaluating indentation
				if (insideSingleQuotes || insideDoubleQuotes || insideSingleLineComment
				|| insideMultiLineComment || insideLiteralRegex){
					if (insideSingleLineComment) continue;
					if (insideLiteralRegex) {
						if (!insideSquareBrackets){
							if (currentLine[j] === '[' 
							&& evenNumberOfBackSlashesBefore(j, currentLine)){
								insideSquareBrackets = true;
							}
						}
						else {
							if (currentLine[j] === ']' 
							&& evenNumberOfBackSlashesBefore(j, currentLine)){
								insideSquareBrackets = false;
							}
						}
						if (currentLine[j] === '/'
						&& evenNumberOfBackSlashesBefore(j, currentLine)){
							if(!insideSquareBrackets){
								insideLiteralRegex = false;
							}
						}
						continue;
					}
					if (currentLine[j] === "'"){
						if(!insideSingleQuotes) continue;
						insideSingleQuotes = false;
					}
					else if (currentLine[j] === '"'){
						if(!insideDoubleQuotes) continue;
						insideDoubleQuotes = false;
					}
					else if (currentLine.substring(j, j + 2) === '*/'){
						if(!insideMultiLineComment) continue;
						insideMultiLineComment = false;
						skipAnIteration = true; //skip over processing the '/' after '*'
					}
				}
			
				else {//not inside any code section to skip over when evaluating indentation
					if (currentLine[j] === "'"){
						insideSingleQuotes = true;
					}
					else if (currentLine[j] === '"'){
						insideDoubleQuotes = true;
					}
					else if (currentLine.substring(j, j + 2) === '//'){
						insideSingleLineComment = true;
						skipAnIteration = true; //skip over processing the '/' after '/'
					}
					else if (currentLine.substring(j, j + 2) === '/*'){
						insideMultiLineComment = true;
						skipAnIteration = true; //skip over processing the '*' after '/'
					}
					else if (currentLine[j] === '/' && //'/' either means regex or division
					!isTheSlashADivisionAt(j, currentLine) ){
						insideLiteralRegex = true;
					}
					else {
						processedLineChars.push(currentLine[j]);
					}
				}
			} //end of loop iterating through the characters of a line
			processedLinesOfCode.push(processedLineChars.join(''));
		}
		return processedLinesOfCode;
	}
	
	//This function count syntactically significant } & { in a line to determine
	// whether to change the current indent level
	function countIndentOf(thisLine){ //thisLine should be a "processed" line of code
		var indent = 0;
		for (var i = 0; i < thisLine.length; i++){
			if (thisLine[i] === '{'){
				indent++;
			} else if (thisLine[i] === '}'){
				indent--;
			}
		}
		return indent;
	}
	
	//This function is called when the user clicks on the 'Fix Indent' button
	function fixIndentation() {
		var indentEachLevelBy;
		var valueOfIndentByBox = document.getElementById('indent-by').value;
		if (valueOfIndentByBox === '1 space') {
			indentEachLevelBy = ' ';
		} else if (valueOfIndentByBox === '2 space') {
			indentEachLevelBy = '  ';
		} else if (valueOfIndentByBox === '4 space') {
			indentEachLevelBy = '    ';
		} else if (valueOfIndentByBox === '1 tab') {
			indentEachLevelBy = '\t';
		}
		
		//Keep track of how many levels deep the current line's indentation is (1,2,3,...)
		var currentIndentLevel = 0;
		
		//Raw lines of code & processed lines of code used to count brackets for indenting
		var linesOfCodeToOutput = codeInput.split('\n');
		var linesOfCodeToCountIndent = getProcessedLinesOfCode();

		//DEBUG: Uncomment to see what types of lines are being evaluated for indenting
		//for (var i = 0; i < linesOfCodeToCountIndent.length; i ++) {
		// 	console.log(linesOfCodeToCountIndent[i]);
		//}

		//Evaluate the processed lines of code and set the final formatted code output
		var formattedOutput = '';
		for (var i = 0; i < linesOfCodeToOutput.length; i++){
			var lineToCountIndent = linesOfCodeToCountIndent[i].trim();
			var lineToOutput = linesOfCodeToOutput[i].trim();
			
			var actualIndentAmount;
			if (lineToCountIndent[0] === '}') {
				actualIndentAmount = currentIndentLevel - 1;
			}
			else actualIndentAmount = currentIndentLevel;
			
			for (var j = 0; j < actualIndentAmount; j++){
				formattedOutput += indentEachLevelBy;
			} //After adding indentation, add the trimmed line of code then a newline
			formattedOutput += lineToOutput + '\n';
			//Count and adjust current indent using the processed line of code
			currentIndentLevel += countIndentOf(lineToCountIndent);
		}
		localStorage.setItem('codeInput', codeInput);
		localStorage.setItem('codeOutput', formattedOutput);
		localStorage.setItem('indentBy', valueOfIndentByBox);
		
		document.getElementById('code-output').innerHTML = formattedOutput;
	}

})();

