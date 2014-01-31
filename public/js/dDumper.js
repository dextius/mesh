/*
|-----------------------------------------------------------------------------|
|                                dDumper 2.0                                  |
|-----------------------------------------------------------------------------|
|                                Developed By:                                |
|                              Joshua Blackburn                               |
|                         (http://joshuablackburn.com)                        |
|-----------------------------------------------------------------------------|
| JavaScript data structure visualization.                                    |
| IE 6+ + Firefox + Opera + Chrome + Safari                                   |
| Please email me any bugs or enhancements @ joshua.blackburn@gmail.com       |
|-----------------------------------------------------------------------------|
| GPL - The GNU General Public License    http://www.gnu.org/licenses/gpl.txt |
| Permits anyone the right to use and modify the software without limitations |
| as long as proper  credits are given  and the original  and modified source |
| code are included. Requires  that the final product, software derivate from |
| the original  source or any  software  utilizing a GPL  component, such  as |
| this, is also licensed under the GPL license.                               |
|-----------------------------------------------------------------------------|
| September 2004 | dDumper created                                            |
| March     2005 | dDumper 1.0.  Optimization and cross-browser support.      |
| November  2005 | dDumper 1.1.  Support for domelement and domcollection.    |
| January   2008 | dDumper 1.2.  Define data types. Add main data type.       |
| May   	2012 | dDumper 1.3.  Fixed typeof error.  Added insert mode.      |
| December	2012 | dDumper 2.0.  Reworked code.  Optimizations.  Added styles.|
|-----------------------------------------------------------------------------|
| Usage:                                                                      |
|   dDumper(args [,args..N]);                                                 |
| 																			  |
| Example:                                                                    |
|   dDumper([1,2,3], 'string', { a : 1 }, /[A-Z]/, 23, variable);             |
| 																			  |
| Insert Mode:															      |
|   If dDumperInsertMode is set to false then only the last dDumper call      |
|   will be displayed on the page.  If set to true each dDumper call will     |
|   append to the page.													      |
|-----------------------------------------------------------------------------|
*/

(function(window) {
	var _ref,
		_insertMode,
		dumpObjs = 0;

	function dDumper() {
		if ( _ref == undefined ) {
			_ref = new _dDumper();
			window.dDumperRef = _ref;
			_dDumperStyles();
		}

		switch(arguments.length) {
			case 0:
				return;
				break;
			case 1:
				_ref.render(arguments[0], true);
				break;
			default:
				for( var arg = 0, len = arguments.length; arg < len; arg++ ) {
					_ref.render(arguments[arg], true);
				}
				break;
		}

		_ref.finish();
	};

	function _dDumper() {
		this.startingDiv = "<div class='dDumperContainer'>";
		this.beginTags = '<tr><td onclick="dDumperRef.collapse(this);" class="start';
		this.middleTags = '</td><td class="middle"><pre>';
		this.endTags = '</pre></td></tr>';
		this.nullTags = '<tr><td onclick="dDumperRef.collapse(this);" class="start vnull">';
		this.objType;
		//this.counter = 0;
		this.childType;
		this.htmldocument = false;

		this.str = this.startingDiv;
	};

	_dDumper.prototype.renderContainer = function(dumpVar) {
		this.uniqueID = "dDumper_" + (new Date()).valueOf() + "_" + Math.floor(Math.random() * 100000);

		this.str += '<table cellspacing="0" class="dDumperParent"><tr><td onclick="dDumperRef.mainCollapse(\''+this.uniqueID+'\');" class="start dDumperParentTitle '+("v" + this.objType)+'">(<a href="javascript:;" title="Remove" onclick="dDumperRef.remove(this);">X</a>) <strong>'+this.objType+'</strong></td></tr><tr><td style="background:#ccc;" id="'+this.uniqueID+'">';
	};

	_dDumper.prototype.render = function(dumpVar, rootLevel) {
		//this.counter += 1;
		this.objType = this.typeOf(dumpVar);

		if ( rootLevel ) this.renderContainer(dumpVar);
		this.str += '<table>';

		//switch(this.objType) {
		switch(true) {
			//case 'window':
			case /window/.test(this.objType):
				break;
			case /error|object|htmldocument|.*event/.test(this.objType):
			//case 'error':
			//case 'object':
			//case 'htmldocument':
			//case 'mouseevent':
				if ( this.htmldocument && (this.objType == 'htmldocument') ) {
					this.htmldocument = true;
					break;
				}

				for ( var i in dumpVar ) {
					try {
						//this.counter += 1;

						if ( dumpVar[i] != null ) {
							this.childType = this.typeOf(dumpVar[i]);
							this.str += this.beginTags + (" v" + this.childType) + '">' + i + ' <i>(' + this.childType + ')</i>' + this.middleTags;
							switch(typeof(dumpVar[i])) {
								case 'object':
									this.render(dumpVar[i]);
									break;
								default:
									try {
										this.str += dumpVar[i].replace(/\</g, '&lt;').replace(/\>/g, '&gt;');
									} catch(e) {
										this.str += dumpVar[i];
									}
							}

							this.str += this.endTags;
						} else {
							this.str += this.nullTags + i + this.middleTags + "null" + this.endTags;
						}
					} catch(e) {}
				}
				break;
			case /array/.test(this.objType):
			//case 'array':
				for ( var j = dumpVar.length - 1; j >= 0; j-- ) {
					try {
						//this.counter += 1;
						if ( dumpVar[j] != null ) {
							this.childType = this.typeOf(dumpVar[j]);
							this.str += this.beginTags + (" v" + this.childType) + '">' + j + ' <i>(' + this.childType + ')</i>' + this.middleTags;
							switch(typeof(dumpVar[j])) {
								case 'object':
									this.render(dumpVar[j]);
									break;
								default:
									try {
										this.str += dumpVar[j].replace(/\</g, '&lt;').replace(/\>/g, '&gt;');
									} catch(e) {
										this.str += dumpVar[j];
									}
							}
						} else {
							this.str += this.nullTags + j + this.middleTags + 'null' + this.endTags;
						}
					} catch(e) {}
				}
				break;
			case /html.*element/.test(this.objType):
			//case 'domelement':
				this.str += this.beginTags + (" v" + this.objType) + '">' + this.objType + ' <i>(' + this.objType + ')</i>' + this.middleTags;
				this.render({'tagName' : dumpVar.tagName, 'innerHTML' : (dumpVar.innerHTML).toString() });
				this.str += this.endTags;
				break;
			case /domcollection/.test(this.objType):
			//case 'domcollection':
				this.str += this.beginTags + (" v" + this.objType) + '">' + this.objType + ' <i>(' + this.objType + ')</i>' + this.middleTags;
				try {
					this.str += dumpVar.replace(/\</g, '&lt;').replace(/\>/g, '&gt;') + this.endTags;
				} catch(e) {
					this.str += dumpVar + this.endTags;
				}
				break;
			default:
				this.str += this.beginTags + (" v" + this.objType) + '">' + this.objType + ' <i>(' + this.objType + ')</i>' + this.middleTags;
				if ( this.objType == 'string' && dumpVar == '' ) dumpVar = '[empty String]';
				try {
					this.str += dumpVar.replace(/\</g, '&lt;').replace(/\>/g, '&gt;');
				} catch(e) {
					this.str += dumpVar + this.endTags;
				}
				break;
		}
		this.str += '</table>';
		if ( rootLevel ) this.str += '</td></tr></table>';
	};

	_dDumper.prototype.finish = function() {
		this.str += '</div>';
		this.display();
	};

	_dDumper.prototype.display = function() {
		if ( ! document.getElementById('dDumperHolder') ) {
			var o = document.createElement("div");
			o.setAttribute("style","width:100%;");
			o.setAttribute("id","dDumperHolder");
			oB = document.body;
			var vContains = oB.insertBefore(o, null); 
			vContains.innerHTML = this.str;

			this.str = null;this.str = this.startingDiv;
		} else { 
			if ( _insertMode ) {
				document.getElementById("dDumperHolder").innerHTML += this.str;
			} else {
				document.getElementById("dDumperHolder").innerHTML = this.str;
			}
			this.str = null;this.str = this.startingDiv;
		}

	};

	_dDumper.prototype.typeOf = function(obj) {
		return ({}).toString.call(obj).match(/\s([a-zA-Z]+)/)[1].toLowerCase();
	};

	function _dDumperStyles() {
		var css = ''+
			'.dDumperContainer {'+
				'font-family: "Helvetica Neue", "Helvetica", "Arial", "sans-serif" !important;'+
				'width: 100%;'+
			'}'+
''+
			'.dDumperContainer a {'+
				'font-family: "Helvetica Neue", "Helvetica", "Arial", "sans-serif";'+
			'}'+
''+
			'.dDumperContainer td.start {'+
				'font-family: "Helvetica Neue", Helvetica, Arial, sans-serif;'+
				'font-size: 14px;'+
				'font-weight: 200;'+
				'line-height: 20px;'+
				'padding: 5px 5px;'+
				'text-align: left;'+
				'vertical-align: top;'+
				'border: 1px solid #222;'+
				'cursor: pointer;'+
			'}'+
''+
			'.dDumperContainer .dDumperParent {'+
				'margin-bottom: 10px;'+
				'border: solid 2px #333;'+
			'}'+
''+
			'.dDumperParentTitle {'+
				'font-family: "Helvetica Neue", Helvetica, Arial, sans-serif;'+
				'font-size: 18px;'+
				'line-height: 20px;'+
			'}'+
''+
			'.dDumperContainer td.middle {'+
				'background: #ddd;'+
				'padding: 5px 5px;'+
			'}'+
''+
			'.dDumperContainer pre {'+
				'font-family: "Helvetica Neue", Helvetica, Arial, sans-serif;'+
				'font-size: 14px;'+
				'font-weight: 200;'+
				'line-height: 20px;'+
				'padding: 5px 5px;'+
				'background:#eee;'+
			'}'+
''+
			'td.varray {'+
				'background: #8b008b;'+
				'color: #fff;'+
			'}'+
			'td.vobject {'+
				'background: #002d70;'+
				'color: #fff;'+
			'}'+
			'td.vregex {'+
				'background: #cd3700;'+
				'color: #fff;'+
			'}'+
			'td.vregexp {'+
				'background: #cd3700;'+
				'color: #fff;'+
			'}'+
			'td.vstring {'+
				'background: #66cd00;'+
				'color: #222;'+
			'}'+
			'td.vnumber {'+
				'background: #caff70;'+
				'color: #222;'+
			'}'+
			'td.vdate {'+
				'background: #eeee00;'+
				'color: #222;'+
			'}'+
			'td.vmath {'+
				'background: #8b;'+
				'color: #222;'+
			'}'+
			'td.vfunction {'+
				'background: #53868b;'+
				'color: #fff;'+
			'}'+
			'td.vboolean {'+
				'background: #ffa500;'+
				'color: #222;'+
			'}'+
			'td.vwindow {'+
				'background: #ffacac;'+
				'color: #222;'+
			'}'+
			'td.vglobal {'+
				'background: #ffacac;'+
				'color: #222;'+
			'}'+
			'td.vevent {'+
				'background: #999;'+
				'color: #fff;'+
			'}'+
			'td.vdomelement {'+
				'background: #cd6839;'+
				'color: #222;'+
			'}'+
			'td.vhtmlbodyelement {'+
				'background: #cd6839;'+
				'color: #222;'+
			'}'+
			'td.vhtmldocument {'+
				'background: #cd6839;'+
				'color: #222;'+
			'}'+
			'td.vhtmldivelement {'+
				'background: #cd6839;'+
				'color: #222;'+
			'}'+
			'td.vdomcollection {'+
				'background: #cd6839;'+
				'color: #222;'+
			'}'+
			'td.vplugincollection {'+
				'background: #cd6839;'+
				'color: #222;'+
			'}'+
			'td.vmimetypecollection {'+
				'background: #cd6839;'+
				'color: #222;'+
			'}'+
			'td.vtextnode {'+
				'background: #cd6839;'+
				'color: #222;'+
			'}'+
			'td.vtextrange {'+
				'background: #cd6839;'+
				'color: #222;'+
			'}'+
			'td.verror {'+
				'background: #fff;'+
				'color: #222;'+
			'}'+
			'td.vnull {'+
				'background: #000;'+
				'color: #fff;'+
			'}'+
			'td.vundefined {'+
				'background: #000;'+
				'color: #fff;'+
			'}'+
			'td.varguments {'+
				'background: #cd8500;'+
				'color: #222;'+
			'}';
		var head = document.getElementsByTagName('head')[0],
			style = document.createElement('style');

		style.type = 'text/css';

		if (style.styleSheet) {
			style.styleSheet.cssText = css;
		} else {
			style.appendChild(document.createTextNode(css));
		}
		head.appendChild(style);
	};

	_dDumper.prototype.set = function(key, value) {
	};

	_dDumper.prototype.collapse = function(node) {
		if ( node.parentNode.childNodes[1].style.display != 'none' ) {
			node.parentNode.childNodes[1].style.display = 'none';
			node.style.fontStyle = 'italic';
			node.style.fontWeight = 'bold';
		} else {
			node.parentNode.childNodes[1].style.display = 'block';
			node.style.fontStyle = 'normal';
			node.style.fontWeight = 'normal';
		}
	};

	_dDumper.prototype.mainCollapse = function(id) {
		var node = document.getElementById(id);
		if ( node.style.display != 'none' ) {
			node.style.display = 'none';
			node.style.fontStyle = 'italic';
			node.style.fontWeight = 'bold';
		} else {
			node.style.display = 'block';
			node.style.fontStyle = 'normal';
			node.style.fontWeight = 'normal';
		}
	}

	_dDumper.prototype.remove = function(node) {
		node.parentNode.parentNode.parentNode.parentNode.style.display = 'none';
	}


	window.dDumper = dDumper;
})(window);

