var mesh = new (function(window, $, _, d3) {
	/* Utilities */
	/* Extends lodash.js */
	var _ = this._ = _;
	_.id = function(id) {
		return document.getElementById(id);
	};
	_.typeOf = function(obj) {
		return ({}).toString.call(obj).match(/\s([a-zA-Z]+)/)[1].toLowerCase();
	};

	_.pad = function(number, len, spaces) {
		var str = number.toString();
		while(str.length < len) {
			if ( spaces ) {
				str = str + "/";
			} else {
				str = '0' + str;
			}
		}

		if ( spaces ) str = str.replace(/\//g, '&nbsp;');

		return str;
	};

	var Theme = this.Theme = new (function() {
		this.currentTheme = "";

		this.setTheme = function(theme) {
			this.currentTheme = theme;

			if ( theme == 'dark' ) {
				$('body').removeClass('goldTheme');

				$('.grid').addClass('gridDark');
				$('body').addClass('darkTheme');
			} else if ( theme == 'gold' ) {
				$('.grid').removeClass('gridDark');
				$('body').removeClass('darkTheme');

				$('body').addClass('goldTheme');
			} else {
				$('.grid').removeClass('gridDark');
				$('body').removeClass('goldTheme');
				$('body').removeClass('darkTheme');
			}
			mesh.Cache.set('theme' + mesh.URL.get().appname, theme);
		};
	})();

	/****************************************************
	*
	* @CLASS 
	* DOM
	*
	*
	******************************************************/
	var Dom = this.Dom = new (function() {
		this.$value = function(field) {
			if ( field.tagName.toLowerCase() == 'select' ) {
				return field.options[field.selectedIndex].value || field.options[field.selectedIndex].text;
			} else if ( field.tagName.toLowerCase() == 'input') {
				return field.value;
			}
		};

		this.$reset = function(field) {
			if ( field.tagName.toLowerCase() == 'select' ) {
				field.empty();
				field.options[0] = new Option();
			} else if ( field.tagName.toLowerCase() == 'input') {
				field.value = '';
			}
		};

		// Allows element to be sized, by percentage, relative to the size of other elements on the page.
		// id - id of tag to size
		// direction - width | height
		// percentage - percentage to size
		// relativeTo - array of ids.  Will subtract total 
		this.sizeTo = function(id, direction, percentage, relativeTo) {
			var less = 0;
			direction == 'height' ? direction = 'outerHeight' : direction = 'outerWidth';

			_.each(relativeTo, function(_id) {
				less += $('#' + _id)[direction]();
			});

			$("#" + id)[direction](Math.floor(($(window)[direction]()) * (percentage * .01)) - less);
		};

	})();

	/****************************************************
	*
	* @CLASS 
	* DISPATCHER
	*
	*
	******************************************************/
	var Dispatch = this.Dispatch = new (function() {
		this.success = function(message, source) {
			$.event.trigger({
				type : "statusEvent",
				eventType : 'success',
				source : source,
				message : message,
				time : Date.now()
			});
		};

		this.error = function(message, source) {
			$.event.trigger({
				type : "statusEvent",
				eventType : 'error',
				source : source,
				message : message,
				time : Date.now()
			});
		};
	})();

	/****************************************************
	*
	* @CLASS 
	* VALIDATE
	*
	*
	******************************************************/
	var Validate = this.Validate = new (function() {
		this.isEmail = function(email) {
			return /^[_a-z0-9-]+(\.[_a-z0-9-]+)*@[a-z0-9-]+(\.[a-z0-9-]+)*(\.[a-z]{2,4})$/.test(email);
		};

		this.isInt = function(value) {
			if((parseFloat(value) == parseInt(value)) && !isNaN(value)){
				return true;
			} else { 
				return false;
			} 
		};
	})();

	/* WebSocket Library */
	/* uses sock.js */
	/****************************************************
	*
	* @CLASS 
	* SOCKET
	*
	*
	******************************************************/
	var Socket = this.Socket = function() { 
		var self = this,
			callbacks = {},
			topics = {},
			pauseQueue = [],
			isPaused = false,
			connection;
			counter = 0;

		var STATE = {
			ACTIVE : "Active",
			CLOSED : "Disconnected",
			PAUSED : "Paused"
		};
		this.state;
		
		this.connect = function(host, port, uri) {
			if ( self.onopen ) self.onopen();
			self.connection = new SockJS('http://' + (host || mesh.URL.get().hostname) + ':' + (port || mesh.DataStore.config.socketPort) + (uri || mesh.DataStore.config.socketPath));
			self.connection.onmessage = self.onmessage;
			self.connection.onopen = self._onopen;
			self.connection.onclose = self._onclose;
		};

		this.disconnect = function() {
			self.connection.close();
			self.stateChange(STATE.CLOSED);
			mesh.Error.raise('Connection to socket server not available. <a href="javascript:mesh.Notice.hide();mesh.ws.connect();">Reconnect</a>');
		};

		this.pause = function() {
			self.pauseQueue = [];
			self.isPaused = true;
			self.stateChange(STATE.PAUSED);
		};

		this.resume = function() {
			self.isPaused = false;
			self.stateChange(STATE.ACTIVE);
		};

		this.stateChange = function(state) {
			this.state = state;
			var tag = $('#socketStatus');

			if ( tag.length > 0 ) {
				$('#socketStatus').html(state);
			}
		};

		this.send = function(action, data, meta) {
			/*
			 * Action = 'database', 'service', 'subscription'
			 * meta = Object.  Used to pass additional data to the server.
			 *    ie  { topic : 'topic.to.subscribe.to' }  or
			 *        { service : 'ServiceNameToCall' }
			*/
			var payload = {
				action : action,
				data : data,
				meta : meta
			};
			self.connection.send(JSON.stringify(payload));
		};

		this.onmessage = function(evt) {
			/*
				Use lodash.js defer method to ensure UI responsiveness.
				defer will ensure message is executed on next available cycle which keeps the UIresponsive.
			 */
			 if ( self.isPaused ) {
				 self.pauseQueue.push(evt.data);
				 return;
			 }


			var msgdata = JSON.parse(evt.data);

			_.defer(function() {
				switch ( msgdata.type ) {
					case 'subscription':
						self.topics[msgdata.topic](msgdata.message);
						break;
					case 'database':
						break;
					case 'service':
						self.callbacks[msgdata.service](msgdata.message);
						break;
				}
			});
		};

		this._onclose = function(evt) {
			self.stateChange(STATE.CLOSED);
			mesh.Error.raise('Connection to socket server not available. <a href="javascript:mesh.Notice.hide();mesh.ws.connect();">Reconnect</a>');
			if ( self.onclose ) self.onclose();
		};

		this._onopen = function(evt) {
			self.stateChange(STATE.ACTIVE);
			if ( self.onopen ) self.onopen();
		};

		this.register = function(service, action) {
			self.callbacks[service] = action;
		};

		this.subscribe = function(topic, action) {
			if ( ! self.topics ) self.topics = {};

			self.topics[topic] = action;
			self.send('subscribe', [], { topic : topic });
		};
	};
	var ws = this.ws = new Socket();

	/****************************************************
	*
	* @CLASS 
	* TIMER
	*
	*
	******************************************************/
	var Timer = this.Timer = new (function() {
		var _start = {};
		var _last = {};
		var _log = {};
		var _lastLog = {};

		this.start = function(id) {
			if ( _log[id] ) {
				_lastLog[id] = _log[id];
			}
			_start[id] = "";
			_last[id] = "";
			_log[id] = [];

			_start[id] = Date.now();
			this.log(id, "=== START ===");
		};

		this.log = function(id, txt) {
			var t = Date.now();

			_log[id].push(txt);
			_log[id].push("Time (ms) = " + (t - _last[id]));
			_log[id].push("--------");

			_last[id] = t;
		};

		this.end = function(id) {
			this.log(id, "=== END ===");
			_log[id].push("Total time: " + (Date.now() - _start[id]));
		};

		this.getLog = function(id) {
			if ( _lastLog[id] ) {
				return _lastLog[id];
			} else {
				return _log[id];
			}
		};
	})();
	/****************************************************
	*
	* @CLASS 
	* NOTIFY
	*
	*
	******************************************************/
	var Notify = this.Notify = new (function() {
		this._notification;

		this.show = function(text, title, icon) {
			if ( Notification && Notification.permission === 'granted' ) {
				this._notification = new Notification(title, {body : text});	
			} else if ( Notification && Notification.permission !== 'denied' ) {
				Notification.requestPermission(function(status) {
					if ( Notification.permission !== status ) {
						Notification.permission = status;
					}

					if ( status === 'granted' ) {
						this._notification = new Notification(title, { body : text});
					} else {
						alert(text);
					}
				});
			} else {
				alert(text);
			}

			if ( this._notification ) this._notification.onclick = function() { this.close(); };
		};
	})();

	/*****************
	 * LOADER & NOTICE
	******************/
	/****************************************************
	*
	* @CLASS 
	* MESSAGE
	*
	*
	******************************************************/
	var Message = this.Message = (function(messageType) {
		var self = this;
		this.loader = '';
		this.textWidth = 0;
		this.timerID;
		this.noticeTimerID;
		this.messageType = messageType;

		this.show = function(text, callback, messageSeverity) {
			clearTimeout(self.timerID);

			if ( self.messageType == mesh.CONSTANTS.NOTICE ) clearTimeout(self.noticeTimerID);
			if ( messageSeverity ) self.messageSeverity = messageSeverity;

			self.check(text || "Loading...");

			// Adjust width for the width of the window
			$("#" + self.messageType).css('display', 'block');

			var _width = self.loader.width() + 20;

			/* Animate the popup */
			$('#' + self.messageType).show().animate({
				width : _width + 'px',
				opacity : 1,
				zIndex : 10000
			}, {
				duration : 250,
				width : 'linear'
			});

			if ( callback ) setTimeout(callback, 300);
			if ( self.messageType == mesh.CONSTANTS.NOTICE ) self.noticeTimerID = setTimeout(self.hide, 6000);
		};

		this.done = function(action) {
			self.finish = action;
		};

		this.hide = function() {
			$('#' + self.messageType).animate({
				width : '1px',
				opacity : 0,
				zIndex : 10000
			}, {
				duration : 250,
				width : 'linear'
			}, function() {
				//console.log('done with animation');
			});
			self.timerID = setTimeout(function() { $("#" + self.messageType).css('display', 'none');}, 750);
		};

		this.check = function(text) {
			if ( $('#' + self.messageType).length < 1 ) {
				if ( self.messageType == 'meshnotice' ) {
					var html = "<div class='alert "+(self.messageSeverity || "alert-info")+"' id='"+self.messageType+"'>" +
									"<button type='button' class='close' onclick='mesh.Notice.hide();'>&times;</button>"+
									"<span id='" + self.messageType + "span'>"+text+"</span>"+
							   "</div>";
				} else {
					var html = "<div class='alert' id='"+self.messageType+"' style='width:0px;'><button type='button' class='close' onclick='mesh.Loader.hide();'>&times;</button><span id='"+self.messageType+"span'>" + text + "</span></div>";	
				}
				$('body').append(html);
				self.loader = $('#' + self.messageType + "span");
			} else {
				$('#' + self.messageType + "span").html(text);
			}
		};
	});


	/* Log */
	/****************************************************
	*
	* @CLASS 
	* ERROR
	*
	*
	******************************************************/
	var Error = this.Error = new (function() {
		var self = this,
			_log = [];

		this.raise = function(err, file, line, colno, error) {
			console.log("Error Occurred", err, "File " + file, "Line " + line, "Column " + colno, error.stack);
			return true;
		};

		this.log = function(err) {
			this._log.push(err);
		};

		this.message = new Message("mesherror");
	})();


	/****************************************************
	*
	* @CLASS 
	* GRID

	  @DESCRIPTION
	  Available grid options available at https://github.com/mleibman/SlickGrid/wiki/Grid-Options
	*
	*
	******************************************************/
	var Grid = this.Grid = new (function() {
		var self = this,
			_grids = {},
			_gridViews = {},
			_gridData = {},
			_gridOptions = {},
			_gridFeatures = {},
			_gridFilters = {},
			_gridEvents = {},
			_gridColumns = {},
			_gridFormatters = {},
			_gridColumnPickers = {},
			_gridFilterTimeout = {},
			_indexes = {},
			_columnLookup = {};

		/* Getters */
		this.grid = function(id) { return _grids[id]; }
		this.view = function(id) { return _gridViews[id]; }
		this.filter = function(id) {return _gridFilters[id]; }
		this.columns = function(id) { return _gridColumns[id]; }
		this.formatters = function(id) { return _gridFormatters[id]; }
		this.features = function(id) { return _gridFeatures[id]; }
		this.options = function(id) { return _gridOptions[id]; }
		this.data = function(id) { return _gridData[id]; }

		this.create = function(id, data, gridOptions, gridFeatures) {
			/* Data Checks */
			if ( ! id ) {
				mesh.Error.raise("No id provided");
				return;
			}

			data ? _gridData[id] = (data) : _gridData[id] = [];

			gridOptions ? _gridOptions[id] = gridOptions : _gridOptions[id] = {};
			gridFeatures ? _gridFeatures[id] = gridFeatures : _gridFeatures[id] = {};

			if ( _gridOptions[id]['forceFitColumns'] == undefined ) _gridOptions[id]['forceFitColumns'] = true;
			if ( _gridOptions[id]['selectedCellCssClass'] == undefined ) _gridOptions[id]['selectedCellCssClass'] = 'slickGridSelected';
			if ( _gridOptions[id]['inlineFilter'] == undefined ) _gridOptions[id]['inlineFilter'] = false;

			/* Check columns */
			if ( gridOptions && gridOptions['columns'] ) { 
				_gridColumns[id] = gridOptions['columns']; 
				_gridOptions[id]['columnLookup'] = {};
				_.each(gridOptions['columns'], function(item, key) {
					_gridOptions[id]['columnLookup'][key] = item;
				});
			}

			_gridOptions[id]['gridid'] = id;
			_gridOptions[id]['subid'] = '';

			/* Check if the user has saved column layout */
			if ( mesh.Cache.get(mesh.URL.get().pathname + id + _gridOptions[id]['subid']) ) {
				_gridColumns[id] = mesh.Cache.get(mesh.URL.get().pathname + id + _gridOptions[id]['subid']);
			}
			self.columnCheck(id);

			/* Create grid view and grid */
			var groupItemMetadataProvider = new Slick.Data.GroupItemMetadataProvider();
			var checkboxPlugin = new Slick.CheckboxSelectColumn({
				cssClass : "slick-cell-checkboxsel"
			});
			if ( _gridOptions[id].checkboxes ) {
				_gridColumns[id].unshift(checkboxPlugin.getColumnDefinition())
			}
			_gridViews[id] = new Slick.Data.DataView({
				groupItemMetadataProvider : groupItemMetadataProvider,
				inlineFilters : false
			});	
			_grids[id] = new Slick.Grid("#" + id, _gridViews[id], _gridColumns[id], _gridOptions[id]);

			_grids[id].registerPlugin(groupItemMetadataProvider);
			_grids[id].registerPlugin(checkboxPlugin);
			_grids[id].registerPlugin(new Slick.AutoTooltips({ enableForHeaderCells : true }));
			_grids[id].setSelectionModel(new Slick.CellSelectionModel());

			var copymanager = new Slick.CellCopyManager();
			_grids[id].registerPlugin(copymanager);

			_gridColumnPickers[id] = new Slick.Controls.ColumnPicker((_gridOptions[id].columnpicker || _gridColumns[id]), _grids[id], _gridOptions[id]);

			_grids[id].onDblClick.subscribe(function(e, args) {
				var cell = _grids[id].getCellFromEvent(e);
				if ( cell == undefined ) return;

				// Don't display details when double clicking grid checkboxes
				if ( _gridOptions[id].checkboxes && cell.cell == 0 ) return;

				var row = cell.row;
				if ( row == undefined ) return;

				var item = _gridViews[id].getItem(row);
				if ( item == undefined ) return;

				var details = _.map(item, function(val, key) {
					return {
						'Key' : key, 
						'Value' : val, 
						id : key
					} 
				});

				if ( ! _grids[id].getOptions()['editable'] ) {
					mesh.Grid.showModal(details);
				}

				if ( _gridEvents[id] && _gridEvents[id]['doubleclick'] ) {
					_gridEvents[id]['doubleclick'](id, cell, row, item, e, args);
				}
			});

			_grids[id].onClick.subscribe(function(e, args) {
				// gridclick
				var item = args.item;
				var cell = _grids[id].getCellFromEvent(e);
				var value = $(_grids[id].getCellNode(cell.row, cell.cell)).html();
				var columns = _grids[id].getColumns();
				var field = columns[cell.cell].field.toLowerCase();

				//console.log(item, cell, value, columns, field);
				// Special case to see if the grid is a flattened modal grid Key / Value
				if ( columns && columns.length > 1 && columns[0].field.toLowerCase() == 'key' && columns[1].field.toLowerCase() == 'value' ) {
					field = $(_grids[id].getCellNode(cell.row, 0)).html().toLowerCase();
				}
			});

			_grids[id].onColumnsReordered.subscribe(function(e, args) {
				// Make a copy of the columns array so a reference to the grid isn't changed.
				var columns = _.extend([], _grids[id].getColumns());
				
				// Account for checkbox column added by slickgrid.  Remove it if it exists
				if ( columns[0] && columns[0].field == 'sel' ) columns.shift();

				mesh.Cache.set(mesh.URL.get().pathname + id + _gridOptions[id]['subid'], columns);
			});

			_grids[id].onColumnsResized.subscribe(function(e, args) {
				// Make a copy of the columns array so a reference to the grid isn't changed.
				var columns = _.extend([], _grids[id].getColumns());

				// Account for checkbox column added by slickgrid.  Remove it if it exists
				if ( columns[0] && columns[0].field == 'sel' ) columns.shift();

				mesh.Cache.set(mesh.URL.get().pathname + id + _gridOptions[id]['subid'], columns);
			});

			copymanager.onCopyCells.subscribe(function(e, args) {
				var from = args.ranges[0];
				var to = args.ranges[0];
				var val = [],
					output = [];

				for (var i = from.fromRow; i <= from.toRow; i++) {
					val = [];
					for (var j = from.fromCell; j <= from.toCell; j++) {
						val.push(($(_grids[id].getCellNode(i, j)).html() || '').replace(',', ''));
					}
					output.push(val.join(','));
				}

				if ( window.clipboardData && window.clipboardData.setData ) {
					window.clipboardData.setData('text', output.join('\n'));
				} else {
					window.prompt("Copy to cliboard: Ctrl+C, Enter", output.join('\n'));
				}
			});

			_gridViews[id].onRowCountChanged.subscribe(function(e, args) {
				_grids[id].updateRowCount();
				_grids[id].render();
			});
			_gridViews[id].onRowsChanged.subscribe(function(e, args) {
				_gridData[id] = _grids[id].getData().getItems();
				_grids[id].invalidateRows(args.rows);
				_grids[id].render();
			});

			_grids[id].onSort.subscribe(function(e, args) {
				mesh.Grid.sorter(id, args.sortCol.field, args.sortAsc);
			});

			/* Set data */
			_gridViews[id].beginUpdate();
			_gridViews[id].setItems(_gridData[id], (gridOptions.customid != undefined ? gridOptions.customid : "id"));
			var filterFunc = new (function(_id, ref) {
				return function(item) { 
					return self.doFilter(_id, item); 
				};
			})(id, self);

			_gridViews[id].setFilter(mesh.Grid.doFilter);
			_gridViews[id].endUpdate();
			_grids[id].render();

			return _grids[id];
		};

		this.modalFlatten = function(data) {
			var details = _.map(data, function(val, key) {
					return {
						'Key' : key, 
						'Value' : val, 
						id : key
					}
			});
			// Go through a second time to pick up values that are objects and flatten those out
			var subdetails = [];
			_.each(details, function(detail) {
				if ( _.typeOf(detail.Value) == "object" && detail.Key != 'parent' ) {
					_.each(detail.Value, function(item, key) {
						subdetails.push({
							'Key' : detail.Key + ":" + key,
							'Value' : item,
							id : detail.Key + ":" + key
						});
					});
				}
			});
			return details.concat(subdetails);
		};

		this.showModal = function(data) {
			/* Requires Bootstrap */
			$('#gridModal').modal();
			mesh.Grid.setData('modalGrid', data);
			mesh.Grid.refresh('modalGrid');
			mesh.Grid.delayedResize('modalGrid');
		};

		this.addData = function(id, data, reverse) {
			self.columnCheck(id, data);

			if ( _.typeOf(data) == 'array' ) { 
				_gridData[id] = _gridData[id].concat(data);
			} else {
				if ( reverse ) {
					_gridData[id].unshift(data);
				} else {
					_gridData[id].push(data);
				}
			}

			_gridViews[id].setItems(_gridData[id], (_gridOptions[id]['customid'] != undefined ? _gridOptions[id]['customid'] : 'id'));
			self.refresh(id);
		};

		this.updateData = function(id, rowId, data) {
		};

		this.setData = function(id, data) {
			if ( data ) {
				_gridData[id] = data;
			} 

			_gridViews[id].setItems(_gridData[id], _gridOptions[id]['customid'] != undefined ?  _gridOptions[id]['customid'] : "id");
			_gridViews[id].setFilterArgs(_gridFilters[id]);
			self.refresh(id);
		};

		this.setSubId = function(id, subid) {
			_gridOptions[id]['subid'] = subid;
		};

		this.setColumns = function(id, data) {
			self.columnCheck(id, data);
			_grids[id].setColumns(_gridColumns[id]);

			self.setColumnPicker(id);
		};

		this.updateColumns = function(id, columns, overrideCache) {
			var _columns = _.extend([], _grids[id].getColumns());

			if ( ! overrideCache ) {
				if ( mesh.Cache.get(mesh.URL.get().pathname + id + _gridOptions[id]['subid']) ) {
					columns = mesh.Cache.get(mesh.URL.get().pathname + id + _gridOptions[id]['subid']);
				}
			}

			_gridColumns[id] = columns;
			_grids[id].setColumns(columns);

			self.setColumnPicker(id);
		};

		this.setColumnPicker = function(id, columns) {
			try {
				_gridColumnPickers[id].removePicker();
			} catch(e) { console.log("no remove func"); }

			_gridColumnPickers[id] = null;
			_gridColumnPickers[id] = new Slick.Controls.ColumnPicker(columns || _gridColumns[id], _grids[id], _gridOptions[id]);
		};

		this.setHeaderRow = function(id) {
			$(_grids[id].getHeaderRow()).delegate(":input", "change keyup", function (e) {
			  var columnId = $(this).data("columnId");
			  var textValue = $(this).val()
			  if (columnId != null) {
				clearTimeout(_gridFilterTimeout[id]);	
				_gridFilterTimeout[id] = setTimeout(function() {
					self.setFilter(id, columnId, $.trim(textValue));
					self.refresh(id);
				}, 350);
			  }
			});
			_grids[id].onHeaderRowCellRendered.subscribe(function(e, args) {
				$(args.node).empty();
				if ( args.column.name != '' ) {
					$("<input type='text'>")
					   .data("columnId", args.column.field)
					   .appendTo(args.node);
				}
			});
			mesh.Grid.grid(id).render();
		};

		this.addListener = function(id, evt, action) {
			if ( ! _gridEvents[id] ) _gridEvents[id] = {};
			_gridEvents[id][evt] = action;
		};

		this.columnCheck = function(id, data) {
			var data = data || _gridData[id];

			/* Check data and add missing columns */ 
			if ( ! _gridColumns[id] ) _gridColumns[id] = [];
			if ( ! _columnLookup[id] ) _columnLookup[id] = {};

			//if ( _gridColumns[id] && ! _gridFeatures[id]['dynamic'] ) return;
			if ( _gridOptions[id] && _gridOptions[id]['columns'] && !_gridOptions[id]['dynamic']) return;

			if ( _gridOptions[id] && _gridOptions[id]['dynamic'] ) {
				_.each(data, function(item, index) {
					_.each(item, function(value, key) {
						if ( key == "id" || key == "_id" ) return;
						if ( ! _columnLookup[id][key] ) {
							_columnLookup[id][key] = key;
							_gridColumns[id].push({
								id : (key == "RowId" ? "RowId" : key.toLowerCase()),
								name : key.replace(/([A-Z])/g, ' $1'),
								field : key,
								editor : _gridOptions[id]['editor'] || undefined,
								sortable : true,
								resizable : true,
								minWidth : (_gridOptions[id].minWidth || 30),
								formatter : (_gridOptions[id].formatter || undefined)
							});
						}
					});
				});
				if ( _gridOptions[id]['additionalColumns'] ) {
					_.each(_gridOptions[id]['additionalColumns'], function(obj) {
						_gridColumns[id].push(obj);
					});
				}
				if ( _gridOptions[id]['prependColumns'] ) {
					_.each(_gridOptions[id]['prependColumns'], function(obj) {
						_gridColumns[id].unshift(obj);
					});
				}
			} else {
				_.each(data[0], function(value, key) {
					if ( key == "id" || key == "_id" ) return;
					if ( ! _columnLookup[id][key] ) {
						_columnLookup[id][key] = key;
						_gridColumns[id].push({
							id : (key == "RowId" ? "RowId" : key.toLowerCase()),
							name : key.replace(/([A-Z])/g, ' $1'),
							field : key,
							sortable : true,
							resizable : true,
							minWidth : (_gridOptions[id].minWidth || 30),
							formatter : (_gridOptions[id].formatter || undefined)
						});
					}
				});
			}
			mesh.Grid.findFormatters(id);
		};

		this.exportToCSV = function(id) {
			var _data = _.extend([], _gridData[id]);
			self.findFormatters(id);
			var formatters = _gridFormatters[id] || {};

			var csv = [];
			var header = [];
			var row = [];
			var item,
				pos,
				idx;

			for ( var pos = 0; pos < _gridViews[id].getLength(); pos++ ) {
				row = [];
				if ( pos < 5000 ) {
					item = _gridViews[id].getItem(pos);
					_.each(item, function(value, key) {
						if ( pos == 0 ) header.push(key);
						value = (value || "").toString().replace(/\<[^>]*\>/g, '');
						row.push(formatters[key] ? (formatters[key]('','',value, '', item) || "").toString().replace(/\<[^>]*\>/g, '') : value);
					});
					if ( pos == 0 ) csv.push(header.join('|'));
					csv.push(row.join('|'));
				}
			}

			/* Requires HTML 5 */
			var a = document.createElement('a');
			a.href = 'data:attachment/csv,' + (csv.join("%0A"));
			a.target = '_blank';
			a.download = 'gridData.csv';

			document.body.appendChild(a);
			a.click();
		};

		this.findFormatters = function(id) {
			/* Create a lookup of formatters for the grid */
			_gridFormatters[id] = {};
			if ( _gridOptions[id] && _gridOptions[id]['dynamic'] && _gridOptions[id]['formatter'] ) {
					_gridFormatters[id] = _gridOptions['formatter'];
			} else {
				_.each(_gridColumns[id], function(column) {
					if ( column.formatter ) {
						_gridFormatters[id][column.field] = column.formatter;
					}
				});
			}
		};

		this.groupBy = function(id, key, desc, labelFunc) {
			_gridViews[id].groupBy(
				key,
				function(g) {
					return labelFunc ? labelFunc(key, g) : key + ":  " + g.value + "  <span style='color:#334d83;'>(" + g.count + " items)</span>";
				},
				function(a,b) {
					if ( desc ) {
						return b.value - a.value;
					} else {
						return a.value - b.value;
					}
				}
			);

			this.refresh(id);
		};

		this.clearGrouping = function(id) {
			_gridViews[id].groupBy(null);
		};

		this.collapseAllGroups = function(id) {
			_gridViews[id].beginUpdate();
			var i = _gridViews[id].getGroups().length -1;
			for ( i; i >= 0; i-- ) {
				_gridViews[id].collapseGroup(_gridViews[id].getGroups()[i].value);
			}
			_gridViews[id].endUpdate();
		};

		this.expandAllGroups = function(id) {
			_gridViews[id].beginUpdate();
			var i = _gridViews[id].getGroups().length -1;
			for ( i; i >= 0; i-- ) {
				_gridViews[id].expandGroup(_gridViews[id].getGroups()[i].value);
			}
			_gridViews[id].endUpdate();
		};

		this.setFilter = function(id, key, value) {
			if ( ! id ) return;
			if ( ! _gridFilters ) return;

			if ( _gridFilters[id] === undefined ) {
				_gridFilters[id] = {};
			}
			/*
			 * Prep value for regex test
			 * replace all commas with RegEx OR
			*/
			mesh.Grid.findFormatters(id);
			if ( _gridOptions[id]['formatter'] ) {
				_gridFilters[id]['meshdynamic'] = true;
			}
			_gridFilters[id]['meshgridid'] = _gridFormatters[id];
			_gridFilters[id][key] = value.replace(/,/g, "|");
			_gridViews[id].setFilterArgs(_gridFilters[id]);
			self.refresh(id);
		};

		this.removeFilter = function(id, key ) {
			delete _gridFilters[id][key];
		};

		this.clearFilters = function(id) {
			if ( ! id ) return;
			_gridFilters[id] = {};
			_gridViews[id].setFilterArgs(_gridFilters[id]);
		};

		this.doFilter = function(item, filters ) {
			if ( ! filters || _.size(filters) < 1 ) {
				return true;
			}
			try {
			var formatter;
			var dynamic = filters['meshdynamic'];
			var id = filters['meshgridid'];
				for ( columnId in filters ) {
					if ( columnId !== undefined && columnId != 'meshgridid' && columnId != 'meshdynamic' ) {
						formatter = dynamic ? id : (id[columnId] || '');
						var formattedString = (formatter ? (formatter)('','',item[columnId], {field : columnId}, item) : item[columnId]).replace(/\<[^>]*\>/g, '');
						if ( (/^>/).test(filters[columnId].toString()) ) {
							if ( +(formattedString.replace(/,/g, '')) <= +(filters[columnId].toString().replace('>', '')) ) {
								return false;
							}
						} else if ( (/^</).test(filters[columnId].toString()) ) {
							if ( +(formattedString.replace(/,/g, '')) >= +(filters[columnId].toString().replace('<', '')) ) {
								return false;
							}
						} else if ( (/^#/).test(filters[columnId].toString()) ) {
							if ( ! eval(filters[columnId].toString().replace(/\#/,'').replace(/\$x/g, isNaN(formattedString.replace(/,/g, '')) ? formattedString : +formattedString.replace(/,/g, ''))) ) {
								return false;
							}
						} else {
							if ( ! (new RegExp(filters[columnId].toString(), "i")).test(formattedString)) {
								return false;
							}
						}
					}
				}
				return true;
			} catch(e) { return true; }
			return true;
		};

		// setSortColumn expects second argument to be true for ascending order
		this.sort = function(id, column, desc) {
			_grids[id].setSortColumn(column, !desc);

			self.sorter(id, column, !desc);

			_grids[id].setSortColumn(column, !desc);
		};

		this.sorter = function(id, column, asc) {
			var sortcol = column;//args.sortCol.field;
			var sortdir = asc ? 1 : -1;//args.sortAsc ? 1 : -1;

			_gridViews[id].sort(
				function(a, b) {
					var x = (a[sortcol] || ''), y = (b[sortcol] || '');

					if ( ! isNaN(+x) && ! isNaN(+y) ) {
						return sortdir * (+x == +y ? 0 : (+x > +y ? 1 : -1));
					} else {
						return sortdir * (x == y ? 0 : (x > y ? 1 : -1));
					}
				}
				, sortdir);
			self.refresh(id);
		};

		this.refresh = function(id) {
			if ( id == undefined ) {
				_.each(self.grids, function(grid, id) { self.refresh(id); });
				return;
			};
			_gridViews[id].refresh();
			try { _gridViews[id].reSort(); } catch(e) {}
			//_grids[id].resizeCanvas();
			_grids[id].invalidate();
			_grids[id].updateRowCount();
			_grids[id].render();
		};

		this.delayedResize = function(id) {
			if ( id ) {
				_.delay(function() {_grids[id].resizeCanvas();mesh.Grid.refresh(id);}, 450);
			} else {
				_.each(self.grids, function(grid, id) { 
					_.delay(function() {_grids[id].resizeCanvas();mesh.Grid.refresh(id);}, 450);
				});
			}
		};
		
		this.reset = function(id) {
			_gridColumns[id] = [];
			_columnLookup[id] = {};
			_gridFormatters[id] = {};
			_gridData[id] = [];
			_gridViews[id].setItems(_gridData[id]);

			mesh.Grid.refresh(id);
		};

		this.resetAll = function() {
			_.each(_grids, function(item, id) {
				self.reset(id);
			});
		};

		this.clear = function(id) {
			_gridData[id] = [];
			_gridViews[id].setItems(_gridData[id]);
			mesh.Grid.refresh(id);
		};

		this.clearAll = function() {
			_.each(_grids, function(item, id) {
				self.clear(id);
			});
		};

		this.resizeGrids = function() {
			_.each(_grids, function(item, id) {
				item.resizeCanvas();
				mesh.Grid.refresh(id);
			});
		};

		this.resizeGrid = function(id) {
			_grids[id].resizeCanvas();
			mesh.Grid.refresh(id);
		};

		this.remove = function(id) {
			// Remove data from grid
			_gridViews[id].beginUpdate();	
			_gridViews[id].getItems().length = 0;	
			_gridViews[id].endUpdate();	

			// Remove from DOM
			mesh._.id(id).innerHTML = '';
			
			// Remove refs
			_gridViews[id] = null;
			delete _gridViews[id];	

			delete _gridData[id];

			_gridOptions[id] = null;
			delete _gridOptions[id];

			_gridFeatures[id] = null;
			delete _gridFeatures[id];

			_gridColumns[id] = null;
			delete _gridColumns[id];

			_gridFormatters[id] = null;
			delete _gridFormatters[id];

			_gridEvents[id] = null;
			delete _gridEvents[id];

			_gridColumnPickers[id] = null;
			delete _gridColumnPickers[id];

			_indexes[id] = null;
			delete _indexes[id];
		};

	})();


	/****************************************************
	*
	* @CLASS 
	* CHARTS

	  @DESCRIPTION
	  D3 Wrapper
	*
	*
	******************************************************/
	
	var Charts = this.Charts = new (function() {
		var self = this,
			_marginX = 120,
			_marginY = 40,
			_margins = {
				withoutContext : {
					margin1 : { top : 20, right : 40, bottom: 40, left: 90}
				},
				withContext : {
					margin1: { top : 20, right : 40, bottom: 20, left: 40},
					margin2: { top : 20, right : 40, bottom: 20, left: 40}
				}
			},
			_charts = {},
			_chartsContext = {},
			_chartData = {},
			_chartOptions = {};

		this.get = function() {
			return [_charts, _chartData, _chartOptions, _chartsContext];
		}

		this.removeChart = function(id) {
			delete _chartData[id];
			delete _charts[id];
			delete _chartOptions[id];

			$("#" + id + "svg").remove();
			$("." + "d3-tip").remove();
			$("#" + id).html('');
		};

		this.getSize = function(id, options) {
			var options = (options || _chartOptions[id]);

			var obj = $("#" + id);
			return {
				width : (options.width || obj.width()) - _margins.withoutContext.margin1.right - _margins.withoutContext.margin1.left,
				height: ((options.height || obj.height()) - _margins.withoutContext.margin1.top - _margins.withoutContext.margin1.bottom),
				marginX : _margins.withoutContext.margin1.right + _margins.withoutContext.margin1.left,
				marginY: _margins.withoutContext.margin1.top + _margins.withoutContext.margin1.bottom,
			}
		};

		this.numericalChart = function(id, data, options) {
			var sizes = self.getSize(id, options);
			var width = sizes.width;
			var height = sizes.height;

			options.width = width;
			options.height = height;
			options._sizes = sizes;

			var alldata = options.flatData || _.flatten(_chartData[id]);
			var x = d3.scale.linear()
				.domain(options.xdomain || [d3.min(alldata, function(d) { return +d[options.x || "x"]; }), d3.max(alldata, function(d) { return +d[options.x || "x"]; })])
				.range([0, width]);
			options._x = x;

			var y = d3.scale.linear()
				.domain([(options.yMin) || d3.min(alldata, function(d) { return +d[options.y || "y"]; }), (options.yMax) || d3.max(alldata, function(d) { return +d[options.y || "y"]; })])
				.range([height, 0]);
			options._y = y;

			var xAxis = d3.svg.axis()
				.scale(x)
				.orient('bottom')
				.tickPadding(10)
				.ticks(options.xticks || 5)
				.tickValues(options.tickValues || "")
				.tickFormat(options.tickFormat || d3.format(",d"))
				.tickSize(-height, 0, 0)
			options._xAxis = xAxis;

			var yAxis = d3.svg.axis()
				.scale(y)
				.orient('left')
				.tickPadding(10)
				.ticks(options.yticks || 5)
				.tickSize(-width, 0, 0)
			options._yAxis = yAxis;


			if ( ! _charts[id] ) {
				_charts[id] = d3.select("#" + id).append('svg:svg')
					.attr('id', id + "svg")
					.attr('width', width + sizes.marginX)
					.attr('height', height + sizes.marginY)
					.append('g')
					.attr("transform", "translate(" + (sizes.marginX * .5) + "," + (sizes.marginY * .5) + ")");
				
				_charts[id].append("g")
					.attr("class", "x axis")
					.attr("transform", "translate(0," + height + ")")
					.call(xAxis)
					.append("text")
					.attr("x", width * .5)
					.attr("y", (sizes.marginY * .33))
					.text(options.xLabel || "");

				_charts[id].append('g')
					.attr('class', 'y axis')
					.call(yAxis)
					.append("text")
					.attr("transform", "rotate(-90)")
					.attr("y", height * -.5)
					.attr("x", sizes.marginX * -.25)
					.style("text-anchor", "end")
					.text(options.yLabel || "");
			} 
			if ( _.last(_chartOptions[id]).tooltips) {
				_.last(_chartOptions[id]).tooltipRef = d3.tip().attr('class', 'd3-tip').offset([-10, 0]).html(function(d) { 
					return d.y; 
				});
				(_charts[id]).call(_.last(_chartOptions[id]).tooltipRef);
			}
		};

		this.chartSetup = function(id, data, options) {
			if ( ! _chartData[id] ) _chartData[id] = [];
			if ( ! _chartOptions[id] ) _chartOptions[id] = [];

			_chartData[id].push(data);
			_chartOptions[id].push(options);
		};

		this.lineChart = function(id, data, options) {
			if ( ! options ) options = {};
			this.chartSetup(id, data, options);

			_.last(_chartOptions[id]).chartType = "line";

			self.numericalChart(id, data, _.last(_chartOptions[id]));

			var line = _createline(id);
			_renderLine(id, line);
		};

		var _createline = function(id) {
			var line = d3.svg.line()
				.x(function(d) { return _.last(_chartOptions[id])._x(d[_.last(_chartOptions[id]).x || "x"]); })
				.y(function(d) { return (_.last(_chartOptions[id])._y)(d[_.last(_chartOptions[id]).y || "y"]); });
			_.last(_chartOptions[id])._shape = line;

			return line;
		};

		var _renderLine = function(id, line) {
			_charts[id].append("path")
				.attr('d', line(_.last(_chartData[id])))
				.attr('class', 'line' + _chartData[id].length);
		};

		this.areaChart = function(id, data, options) {
			if ( ! options ) options = {};

			this.chartSetup(id, data, options);

			_.last(_chartOptions[id]).chartType = "area";

			self.numericalChart(id, data, _.last(_chartOptions[id]));

			var area = _createarea(id);
			_renderArea(id, area);
			_renderLine(id, _createline(id));

		};

		var _createarea = function(id) {
			var area = d3.svg.area()
				.x(function(d) { return _.last(_chartOptions[id])._x(d[_.last(_chartOptions[id]).x || "x"]); })
				.y0(_.last(_chartOptions[id]).height)
				.y1(function(d) { return ( _.last(_chartOptions[id])._y)(d[_.last(_chartOptions[id]).y || "y"]); });
			_.last(_chartOptions[id])._shape = area;

			return area;
		};

		var _renderArea = function(id, area) {
			_charts[id].append("path")
				.attr('d', area(_.last(_chartData[id])))
				.attr('class', 'area' + _chartData[id].length)
		};

		this.scatterChart = function(id, data, options) {
			if ( ! options ) options = {};

			this.chartSetup(id, data, options);

			_.last(_chartOptions[id]).chartType = "scatter";

			self.numericalChart(id, data, _.last(_chartOptions[id]));

			var scatter = _renderScatter(id);
		};

		var _createscatter = function(id) {

			var scatter = (_charts[id]).selectAll(".dot")
				.data(_.last(_chartData[id]))
				.enter().append("circle")
				.attr('class', 'dot')
				.attr('r', _.last(_chartOptions[id]).radius || 1.5)
				.attr('cx', function(d) { return _.last(_chartOptions[id])._x(d[_.last(_chartOptions[id]).x || "x"]); })
				.attr('cy', function(d) { return _.last(_chartOptions[id])._y(d[_.last(_chartOptions[id]).y || "y"]); })
				.on('mouseover', function(d) { _.last(_chartOptions[id]).tooltipRef.show(d);})
				.on('mouseout', (_.last(_chartOptions[id]).tooltips ? _.last(_chartOptions[id]).tooltipRef.hide : function(){}))
				.style("fill", _.last(_chartOptions[id]).fill || "#ccc")
				.style("stroke", _.last(_chartOptions[id]).stroke || "#999");

			return scatter;
		};

		var _renderScatter = function(id) {
			return _createscatter(id);
		};

		this.barChart = function(id, data, options) {
			if ( ! options ) options = {};

			this.chartSetup(id, data, options);

			_.last(_chartOptions[id]).chartType = "bar";

			self.numericalChart(id, data, _.last(_chartOptions[id]));

			var bar = _renderBar(id);
		};

		var _createbar = function(id) {
			var bar = (_charts[id]).selectAll(".bar")
				.data(_.last(_chartData[id]))
				.enter().append("rect")
				.on('mouseover', (_.last(_chartOptions[id]).tooltips ? _.last(_chartOptions[id]).tooltipRef.show : function() {}))
				.on('mouseout', (_.last(_chartOptions[id]).tooltips ? _.last(_chartOptions[id]).tooltipRef.hide : function(){}))
				.attr('x', function(d) { return _.last(_chartOptions[id])._x(d[_.last(_chartOptions[id]).x || "x"]); })
				.attr('y', function(d) { return _.last(_chartOptions[id])._y(d[_.last(_chartOptions[id]).y || "y"]); })
				.attr('width', _.last(_chartOptions[id]).barWidth ? function(d) { return _.last(_chartOptions[id]).barWidth; } : function(d) { return _.last(_chartOptions[id]).width / (_.last(_chartData[id]).length + 1)})
				.attr('height', function(d) { var h = _.last(_chartOptions[id]).height - _.last(_chartOptions[id])._y(d[_.last(_chartOptions[id]).y || "y"]); h < 0 ? h = 0 : h = h; return h; })
				.attr("class", "bar" + _chartData[id].length);

			return bar;
		};

		var _renderBar = function(id) {
			return _createbar(id);
		};

		this.redraw = function(id, data, options) {
			var localOptions = _.extend({}, _chartOptions[id]);
			var localData = _.extend({}, _chartData[id]);

			self.removeChart(id);

			_.each(localOptions, function(item, position) {
				self[item.chartType + "Chart"](id, (data ? data[position] : localData[position]), (options || localOptions[position]));
			});
		};

		this.redrawAll = function() {
			_.each(_charts, function(chart, id) {
				self.redraw(id);
			});
		};
	});
	/****************************************************
	*
	* @CLASS 
	* DROPPER
	*
	*
	******************************************************/
	var Dropper = this.Dropper = new (function() {
		var _queue = [];
		var _setup = false;

		this.setup = function() {
			if ( _setup == true ) return;

			_setup = true;
			$(document.body).on("dragenter dragstart dragend dragleave dragover drag drop", function (e) { e.preventDefault(); });

			$(document.body).on('drop', function(e) {
				e.preventDefault && e.preventDefault();

				var files = e.originalEvent.dataTransfer.files;
				var reader = new FileReader();
				var fileContents;
				reader.onload = function(e) {
					_.each(_queue, function(callback) {
						(callback)(e.target.result);
					});
				};

				_.each(files, function(file) {
					fileContents = reader.readAsText(file);
				});
			});
		};

		this.listen = function(func) {
			if ( ! _setup ) this.setup();
			_queue.push(func);
		};
	})();

	/****************************************************
	*
	* @CLASS 
	* FORMATTERS
	*
	*
	******************************************************/
	var formatters = this.formatters = new (function() {
		var self = this;

		this.tomorrow = parseInt(moment().add('days', 2).format('X'));

		this.number = function(row, cell, value, columnDef, dataContext) {
			if ( value == undefined ) return '';
			return accounting.formatNumber(value);
		};

		this.fillnumber = function(row, cell, value, columnDef, dataContext) {
			if ( value == undefined ) return '';
			return "<span class='"+(value >= mesh.CONSTANTS.BLOCK_TRADE ? 'color-orange' : '')+"'>" + accounting.formatNumber(value) + "</span>";
		};
	
		this.tradesnumber = function(row, cell, value, columnDef, dataContext) {
			if ( value == undefined ) return '';
			if ( value >= 5000 && (dataContext.TradePrice >= 10000)) {
				return "<div class='largetrade'>" + accounting.formatNumber(value) + "</div>";
			} else {
				return accounting.formatNumber(value);
			}
		};

		this.percentage = function(row, cell, value, columnDef, dataContext) {
			if ( value == undefined ) return '';
			if ( isNaN(value) ) return value;

			return ((value * 100000) / 1000).toFixed(3);
		};

		this.percentageRounded = function(row, cell, value, columnDef, dataContext) {
			if ( value == undefined ) return '';
			if ( isNaN(value) ) return value;

			return Math.round(((value * 100000) / 1000).toFixed(3));
		};

		this.price = function(row, cell, value, columnDef, dataContext) {
			if ( value == undefined ) return '';
			return accounting.formatMoney(value);
		};

		this.bold = function(row, cell, value, columnDef, dataContext) {
			if ( value == undefined ) return '';
			return "<b>" + value + "</b>";
		};

		this.datetime = function(row, cell, value, columnDef, dataContext) {
			if ( value == undefined ) return '';
			if ( typeof value == "string" && isNaN(value) ) {
				return moment(value, "ddd MMM DD HH:MM:ss EDT YYYY").format("MM/DD/YYYY HH:mm:ss");
			} else {
				return moment(value).format("YYYY.MM.DD.HH.mm.ss.SSS");
			}
		};

		this.datetimelong = function(row, cell, value, columnDef, dataContext) {
			if ( value == undefined ) return '';
			return moment(value).format("YYYY.MM.DD.HH.mm.ss.SSS");
		};

		this.dateonly = function(row, cell, value, columnDef, dataContext) {
			if ( value == undefined ) return '';
			return moment(value).format("YYYY.MM.DD");
		};

		this.timeonly = function(row, cell, value, columnDef, dataContext) {
			if ( value == undefined ) return '';
			if ( isNaN(value) ) {
				return value;
			}

			return moment(value).format("HH:mm:ss.SSS");
		};

	})();

	/****************************************************
	*
	* @CLASS
	* CONSTANTS
	*
	*
	******************************************************/
	var CONSTANTS = this.CONSTANTS = {
		NOTICE : 'meshnotice',
		LOADER : 'meshloader',
		MESSAGE_TYPES : {
			ERROR : 'alert-error',
			SUCCESS : 'alert-success',
			INFO : 'alert-info'
		},
		START_OF_DAY_NANOS : moment().startOf('day').valueOf() * 1000000
	};

	/****************************************************
	*
	* @CLASS
	* DATASTORE
	*
	*
	******************************************************/
	var DataStore = this.DataStore = new (function() {
		var self = this;
		this.schema;
		this.config;
	})();

	/****************************************************
	*
	* @CLASS
	* CACHE

	  @DESCRIPTION 
	  - Used to store data in the local browser

	*
	*
	******************************************************/
	var Cache = this.Cache = new (function() {
		this.get = function(key) {
			var stored = stash.get(key);
			if ( ! stored ) return undefined;

			if ( stored.ttl != undefined ) {
				if ( (new Date()).valueOf() > stored.ttl ) {
					return undefined;
				}
			}
			return stored.data;
		};

		this.set = function(key, value, ttl) {
			stash.set(key, {
				data : value,
				ttl : ttl
			});
		};

		this.getBypass = function(key, value) {
			return localStorage.getItem(key);
		};

		this.setBypass = function(key, value) {
			return localStorage.setItem(key, value);
		};

		this.del = function(key) {
			stash.cut(key);
		};

		this.clearLocal = function() {
			_.each(stash.getAll(), function(value, key) {
				if ( key.indexOf(mesh.URL.get().pathname) != -1 ) {
					mesh.Cache.del(key);
				}
			});
		};

		this.incr = function(key) {
			var stored = mesh.Cache.get(key);
			if ( stored ) {
				stored.data += 1;
				mesh.Cache.set(key, stored.data, stored.ttl);
			}
		};

		this.decr = function(key) {
			var stored = mesh.Cache.get(key);
			if ( stored ) {
				stored.data -= 1;
				mesh.Cache.set(key, stored.data, stored.ttl);
			}
		};

		this.ttl = function(minutes) {
			return (new Date()).valueOf() + (minutes * 60 * 1000);
		};
	})();

	/****************************************************
	*
	* @CLASS
	* URL
	*
	*
	******************************************************/
	var URL = this.URL = new (function() {
		var parser;
		var baseURL;

		this.params = {};
		this.update = function(url, search) {
			var urlstring = [];

			_.map((search.replace('?', '')).split('&'), function(param) { mesh.URL.params[param.split('=')[0].toLowerCase()] = encodeURIComponent(param.split('=')[1])});

			_.map(mesh.URL.params, function(val, key) {
				urlstring.push(key + "=" + val);
			});

			window.history.pushState({}, "MESH", (url || baseURL) + "?" + urlstring.join('&') + (parser.hash || ""));
		};

		/*
			Returns object with:
			protocol => "http:"
			hostname => "example.com" || "127.0.0.1"
			port => "8080"
			pathname => "/mesh/apps"
			search => "?q=searchstring&column=2"
			hash => "#top"
			host => "example.com:8080" || "127.0.0.1:8080"
			appname => "spotlight"
			href => returns full url
		*/
		this.get = function() { return parser; }

		this.parse = function(url) {
			var doc = document.createElement('a');
			return doc.href = url;
		};

		this.set = function(href) {
			parser = document.createElement('a');
			parser.href = href;
			baseURL = href.split('?')[0];

			// Parse the search string and build has of values
			if ( parser.search ) {
				_.map((parser.search.replace('?', '')).split('&'), function(param) { mesh.URL.params[param.split('=')[0].toLowerCase()] = param.split('=')[1]});
			}

			var pathParts = parser.pathname.split('/');
			if ( _.last(pathParts) == "" ) pathParts.pop();

			parser.appname = _.last(pathParts);
		};
	})();

	/****************************************************
	*
	* 
	* WINDOW LOAD EVENT
	*
	*
	******************************************************/
	$(window).load(function() {
		// Capture all errors centrally instead of using try/catch.  Try/Catch
		// prevents V8 from optimizing functions.  
		window.onerror = mesh.Error.raise;

		// Parse URL
		mesh.URL.set(window.location.href);

		$(document).keydown(function(e) {
			// Centrally capture key events
		});

		mesh.Loader = new Message(mesh.CONSTANTS.LOADER);
		mesh.Notice = new Message(mesh.CONSTANTS.NOTICE);

		if ( app && app.load ) {
			// Call the local app after window has loaded.
			app.load();
		}
	});

	// Things to do when window is resized
	/****************************************************
	*
	* 
	* WINDOW RESIZE EVENT
	*
	*
	******************************************************/
	$(window).resize(_.debounce(function() {
		mesh.Grid.resizeGrids();
		if ( app && app.adjustGrids ) {
			app.adjustGrids();
		} else {
			mesh.Grid.delayedResize();
		}
	},300));


	
})(window, jQuery, _, d3);
