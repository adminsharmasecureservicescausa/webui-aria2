var modals = {
	err_connect: undefined,
	change_conf: undefined,
	newDownload_modal: undefined,
	global_settings_modal: undefined,
	global_statistics_modal: undefined,
	download_settings_modal: undefined
};
var clear_dialogs = function() {
	for(var i in modals) {
		modals[i].modal('hide');
	}
};
var server_conf = {
	host: 'localhost',
	port: 6800,
	user: "",
	pass: ""
};
var custom_aria2_connect = function() {
	clear_dialogs();
	modals.change_conf.modal('show');
};
var update_server_conf = function() {
	var host = $('#input_host').val().trim();
	var port = $('#input_port').val().trim();
	server_conf.user = $('#input_user').val().trim();
	server_conf.pass = $('#input_pass').val().trim();
	if(host.length !== 0) {
		server_conf.host = host;
	}
	if(port.length !== 0) {
		server_conf.port = port;
	}

	clear_dialogs();
	update_ui();
};

function param_encode(param) {
	if(param) {
		param = base64.btoa(JSON.stringify(param));
	}
	return param;
}
var aria_syscall = function(conf, multicall) {
	$.ajax({
		url: 'http://' + server_conf.host + ':' + server_conf.port + '/jsonrpc',
		timeout: 1000,
		data: {
			jsonrpc: 2.0,
			id: 'webui',
			method: multicall? conf.func:'aria2.' + conf.func,
			params: param_encode(conf.params)
		},
		success: conf.success,
		error: function() {
			if(server_conf.user.length) {
				var url = 'http://' +
					server_conf.user +  ":" +
					server_conf.pass + "@" +
					server_conf.host + ':' +
					server_conf.port + '/jsonrpc';

				/* hack for http authentication */
				var img = $('<img/>').attr("src", url);
				$('body').append(img);
				img.remove();

				setTimeout(function() {
					$.ajax({
						url: url,
						timeout: 1000,
						data: {
							jsonrpc: 2.0,
							id: 'webui',
							method: multicall? conf.func:'aria2.' + conf.func,
							params: param_encode(conf.params)
						},
						success: conf.success,
						error: conf.error,
						dataType: 'jsonp',
						jsonp: 'jsoncallback'
					});
				}, 1000);
			}
			else if(conf.error) {
				conf.error();
			}
		},
		dataType: 'jsonp',
		jsonp: 'jsoncallback'
	});

}
var update_ui = function() {
	updateDownloads();
};

$(function() {
	var modal_conf = {
		show: false
	};
	modals.err_connect = $('#error_connect').modal(modal_conf);
	modals.change_conf = $('#change_conf').modal(modal_conf);
	modals.newDownload_modal = $('#newDownload_modal').modal(modal_conf);
	modals.global_settings_modal = $('#global_settings_modal').modal(modal_conf);
	modals.download_settings_modal = $('#download_settings_modal').modal(modal_conf);
	modals.global_statistics_modal = $('#global_statistics_modal').modal(modal_conf);

	update_ui();
	$('#newDownload').click(function() {
		$('#newDownload_url').val("");
		$('.download_urls').html("");
		modals.newDownload_modal.modal('show');
	});
	$('#multiple_uris').click(function() {
		var url = $('#newDownload_url').val();
		var html = '<li>';
		html += '<span class="uris">';
		html += url;
		html += '</span>';
		html += '             ';
		html += '<a href="#"><i class="icon-trash"></i></a></li>';
		$(html).appendTo('.download_urls');
		$('#newDownload_url').val("");
		$('.download_urls a').unbind('click').click(function() {
			$(this).parents('li').remove();
		});
	});
	$('#addNewDownload').click(newDownload);
});
function check_global(name) {
	for(var i = 0; i < global_settings_exclude.length; i++) {
		if(global_settings_exclude[i] === name) {
			return false;
		}
	}
	return true;
}
function merge_settings_data(sets, res) {
	for(var i in res) {
		for(var j = 0; j < sets.length; j++) {
			if(sets[j].name === i) {
				sets[j].value = res[i].trim();
				sets[j].has_value = true;
				if(sets[j].option) {
					for(var k = 0; k < sets[j].options.length; k++) {
						var tmp = {
							val: sets[j].options[k],
							disp: sets[j].options[k]
						};

						if(sets[j].options[k] === sets[j].value) {
							tmp.val = sets[j].value + '" selected="true';
						}
						sets[j].options[k] = tmp;
					}
				}
			}
		}
	}
}
function get_global_settings(cb) {
	var sets = [];
	var tmp_set = [];
	for(var i = 0; i < input_file_settings.length; i++) {
		tmp_set = $.extend(true, {}, input_file_settings[i]);
		if(check_global(tmp_set)) {
			sets.push(tmp_set);
		}
	}
	for(var i = 0; i < global_settings.length; i++) {
		tmp_set = $.extend(true, {}, global_settings[i]);
		if(check_global(tmp_set)) {
			sets.push(tmp_set);
		}
	}
	aria_syscall({
		func: 'getGlobalOption',
		success: function(data) {
			var res = data.result;
			merge_settings_data(sets, res);
			cb(sets);
		},
		error: function() {
			alert("Connection to aria server failed");
		}
	});
}
function custom_global_settings() {
	var gen = function(name) {
		return { name: name, values: [] };
	};
	var general_settings = gen("General Settings");
	var torrent_settings = gen("Bit-Torrent Settings");
	var ftp_settings = gen("FTP Settings");
	var http_settings = gen("HTTP(S) Settings");
	var metalink_settings = gen("Metalink Settings");

	get_global_settings(function(sets) {
		for(var i = 0; i < sets.length; i++) {
			var set = sets[i];
			if(set.name.indexOf("bt") !== -1 || set.name.indexOf("torrent") !== -1) {
				torrent_settings.values.push(set);
			}
			else if(set.name.indexOf("metalink") !== -1) {
				metalink_settings.values.push(set);
			}
			else if(set.name.indexOf("http") !== -1) {
				http_settings.values.push(set);
			}
			else if(set.name.indexOf("ftp") !== -1) {
				ftp_settings.values.push(set);
			}
			else
				general_settings.values.push(set);

		}

		var templ = $('#global_general_settings_template').text();
		var item = Mustache.render(templ, {
			settings: [
				general_settings,
				http_settings,
				ftp_settings,
				torrent_settings,
				metalink_settings
			]
		});
		$('#dynamic_global_settings').html(item);
		modals.global_settings_modal.modal('show');
		$("#save_global_settings").one('click',function() {
			var settings = {};
			for(var i = 0; i < sets.length; i++) {
				var elem = $("#input_settings_" + sets[i].name);
				if(sets[i].value) {
					if(elem.val() !== sets[i].value) {
						settings[sets[i].name] = elem.val();
					}
				}
				else if(elem.val() !== "no_val" && elem.val() !== "") {
					settings[sets[i].name] = elem.val();
				}
			}
			if(!$.isEmptyObject(settings)) {
				aria_syscall({
					func: 'changeGlobalOption',
					params: [settings],
					success: function(data) {
						clear_dialogs();
					}
				});
			}
			else {
				clear_dialogs();
			}
		});
	});
}

function addDownload(uris) {
	console.log("adding download:");
	console.log(uris);
	aria_syscall({
		func: 'addUri',
		params: uris,
		success: function() {
			clear_dialogs();
			update_ui();
		}
	});
}

function newDownload() {
	var li = $('.download_urls li');
	var urls = [];
	for(var i = 0; i < li.length; i++) {
		urls.push($(li[i]).text().trim());

	}
	var inp_url = $('#newDownload_url').val().trim();
	if(inp_url.length > 0) urls.push(inp_url);
	addDownload([urls]);
}

var d_files = {
	active: [],
	waiting: [],
	stopped: []
};
function changeLength(len, pref) {
	len = parseInt(len);
	if(len <= (1<<10)) return len  + " " + pref;
	else if(len <= (1<<20)) return (len/(1<<10)).toFixed(1) + " K" + pref;
	else if(len <= (1<<30)) return (len/(1<<20)).toFixed(1) + " M" + pref;
	else return (len/(1<<30)).toFixed(1) + " G" + pref;
}
function changeTime(time) {
	time = parseInt(time);
	if(!time) return "infinite";
	if(time < 60) return time + " s";
	else if(time < 60*60) return (time/60).toFixed(2) + " min";
	else if(time < 60*60*24) return (time/(60*60)).toFixed(2) + " hours";
	else return (time/(60*60*24)).toFixed(2) + " days!!";

}
function getTemplateCtx(data) {
	var percentage =(data.completedLength / data.totalLength)*100;
	percentage = percentage.toFixed(2);
	if(!percentage) percentage = 0;
	var name;
	if(data.files[0].uris.length) {
		name = data.files[0].uris[0].uri.replace(/^.*[\\\/]/, '');
	}
	else {
		name = data.files[0].path.replace(/^.*[\\\/\]]/, '');
	}

	var eta = changeTime((data.totalLength-data.completedLength)/data.downloadSpeed);
	return {
		name: name,
		sett_name: name.substr(0,name.lastIndexOf('.')) || name,
		status: data.status,
		percentage:percentage,
		gid: data.gid,
		size: changeLength(data.totalLength, "B"),
		down_speed: changeLength(data.downloadSpeed, "B/s"),
		remaining: changeLength(data.totalLength - data.completedLength, "B"),
		eta: eta,
		downloaded: changeLength(data.completedLength, "B"),
		dir: data.dir,
		numPieces: data.numPieces,
		pieceLength: changeLength(data.pieceLength, "B"),
		uploadLength: changeLength(data.uploadLength, "B"),
		upload_speed: changeLength(data.uploadSpeed, "B/s")

	};
}
function updateDownloadTemplates(elem, ctx) {
	elem = $(elem);
	for(var i in ctx) {
		elem.find('.tmp_' + i).text(ctx[i]);
	}
	elem.find('.bar').css('width', ctx.percentage + '%');
}
function deleteDownloadTemplates(top_elem, data) {
	if(!data) {
		$(top_elem).html("");
	}
	else {
		var elems = $(top_elem).find('[data-gid]');
		for(var i = 0; i < elems.length; i++) {
			var elem = $(elems[i]);
			var gid = elem.attr('data-gid').toString();
			var found = false;
			for(var j = 0; j < data.length; j++) {
				if(gid === data[j].gid.toString())
					found = true;
			}
			if(!found)
				elem.remove();
		}
	}
}
function refreshDownloadTemplates(top_elem, data) {
	var down_template = $('#download_' + top_elem + '_template').text();
	deleteDownloadTemplates('#' + top_elem + '_downloads', data);
	for(var i = 0; i < data.length; i++) {
		var ctx = getTemplateCtx(data[i]);
		var elem = $('[data-gid=' + ctx.gid + ']');
		if(elem.length) {
			updateDownloadTemplates(elem, ctx);
		} else {
			var item = Mustache.render(down_template, ctx);
			$('#' + top_elem + '_downloads').prepend(item);
		}
	}

}
function getActiveSettings(gid, cb) {
	var sets = [];
	var tmp_set = [];
	for(var i = 0; i < download_active_settings.length; i++) {
		tmp_set = $.extend(true, {}, download_active_settings[i]);
		sets.push(tmp_set);
	}
	aria_syscall({
		func: 'getOption',
		params: [gid],
		success: function(data) {
			var res = data.result;
			merge_settings_data(sets, res);
			cb(sets);
		},
		error: function() {
			alert("Connection to aria server failed");
		}
	});
}
function check_waiting(name) {
	for(var i = 0; i < download_waiting_exclude.length; i++) {
		if(download_waiting_exclude[i] === name) {
			return false;
		}
	}
	return true;
}
function getWaitingSettings(gid, cb) {
	var sets = [];
	var tmp_set = [];
	for(var i = 0; i < input_file_settings.length; i++) {
		tmp_set = $.extend(true, {}, input_file_settings[i]);
		if(check_waiting(tmp_set)) {
			sets.push(tmp_set);
		}
	}
	for(var i = 0; i < download_active_settings.length; i++) {
		tmp_set = $.extend(true, {}, download_active_settings[i]);
		if(check_waiting(tmp_set)) {
			sets.push(tmp_set);
		}
	}
	aria_syscall({
		func: 'getOption',
		params: [gid],
		success: function(data) {
			var res = data.result;
			merge_settings_data(sets, res);
			cb(sets);
		},
		error: function() {
			alert("Connection to aria server failed");
		}
	});
}
function empty_download_set(elem) {
	var len = d_files.active.length;
	len += d_files.waiting.length;
	len += d_files.stopped.length;
	if(len === 0) {
		var html = '<div class="hero-unit"><h3>';

		html += 'Currently no downloads in line to display, use the Add download button to start downloading files!';
		html += '</h3></div>';
		$(elem).html(html);
	}
}
function updateActiveDownloads(data) {
	refreshDownloadTemplates('active', data);
	empty_download_set('#active_downloads');
	$('.download_active_item .download_settings').unbind('click').click(function() {
		var gid = $(this).parents('.download_active_item').attr('data-gid');
		var settings_name = $(this).parents('.download_active_item').attr('data-settingsName');
		var gen = function(name) {
			return { name: name, values: [] };
		};
		var general_settings = gen("General Settings");
		var torrent_settings = gen("Bit-Torrent Settings");

		getActiveSettings(gid, function(sets) {
			for(var i = 0; i < sets.length; i++) {
				var set = sets[i];
				if(set.name.indexOf("bt") !== -1 || set.name.indexOf("torrent") !== -1) {
					torrent_settings.values.push(set);
				}
				else
					general_settings.values.push(set);

			}

			var templ = $('#download_settings_template').text();
			var item = Mustache.render(templ, {
				settings_name: settings_name,
				gid: gid,
				settings: [
					general_settings,
					torrent_settings
				]
			});
			$('#download_settings_modal').html(item);
			modals.download_settings_modal.modal('show');
			$("#save_download_settings").one('click',function() {
				var settings = {};
				for(var i = 0; i < sets.length; i++) {
					var elem = $("#download_settings_" + sets[i].name);
					if(sets[i].value) {
						if(elem.val() !== sets[i].value) {
							settings[sets[i].name] = elem.val();
						}
					}
					else if(elem.val() !== "no_val" && elem.val() !== "") {
						settings[sets[i].name] = elem.val();
					}
				}
				if(!$.isEmptyObject(settings)) {
					aria_syscall({
						func: 'changeOption',
						params: [gid, settings],
						success: function(data) {
							clear_dialogs();
						}
					});
				}
				else {
					clear_dialogs();
				}
			});
		});
	});
	$('.download_active_item .download_pause').unbind('click').click(function() {
		var gid = $(this).parents('.download_active_item').attr('data-gid');
		aria_syscall({
			func: 'pause',
			params: [gid],
			success: function() {
				update_ui();
			},
			error: function(err) {
				console.log("error pausing active download!!!");
				console.log(err);
			}
		});
	});
	$('.download_active_item .download_remove').unbind('click').click(function() {
		var gid = $(this).parents('.download_active_item').attr('data-gid');
		aria_syscall({
			func: 'remove',
			params: [gid],
			success: function() {
				update_ui();
			},
			error: function(err) {
				console.log("error removing active download!!!");
				console.log(err);
			}
		});
	});
}
function updateWaitingDownloads(data) {
	refreshDownloadTemplates('waiting', data);
	$('.download_waiting_item .download_settings').unbind('click').click(function() {
		var gid = $(this).parents('.download_waiting_item').attr('data-gid');
		var settings_name = $(this).parents('.download_waiting_item').attr('data-settingsName');
		var gen = function(name) {
			return { name: name, values: [] };
		};
		var general_settings = gen("General Settings");
		var torrent_settings = gen("Bit-Torrent Settings");
		var ftp_settings = gen("FTP Settings");
		var http_settings = gen("HTTP(S) Settings");
		var metalink_settings = gen("Metalink Settings");

		getWaitingSettings(gid, function(sets) {
			for(var i = 0; i < sets.length; i++) {
				var set = sets[i];
				if(set.name.indexOf("bt") !== -1 || set.name.indexOf("torrent") !== -1) {
					torrent_settings.values.push(set);
				}
				else if(set.name.indexOf("metalink") !== -1) {
					metalink_settings.values.push(set);
				}
				else if(set.name.indexOf("http") !== -1) {
					http_settings.values.push(set);
				}
				else if(set.name.indexOf("ftp") !== -1) {
					ftp_settings.values.push(set);
				}
				else
					general_settings.values.push(set);

			}

			var templ = $('#download_settings_template').text();
			var item = Mustache.render(templ, {
				settings_name: settings_name,
				gid: gid,
				settings: [
					general_settings,
					http_settings,
					ftp_settings,
					torrent_settings,
					metalink_settings
				]
			});
			$('#download_settings_modal').html(item);
			modals.download_settings_modal.modal('show');
			$("#save_download_settings").one('click',function() {
				var settings = {};
				for(var i = 0; i < sets.length; i++) {
					var elem = $("#download_settings_" + sets[i].name);
					if(sets[i].value) {
						if(elem.val() !== sets[i].value) {
							settings[sets[i].name] = elem.val();
						}
					}
					else if(elem.val() !== "no_val" && elem.val() !== "") {
						settings[sets[i].name] = elem.val();
					}
				}
				if(!$.isEmptyObject(settings)) {
					aria_syscall({
						func: 'changeOption',
						params: [gid, settings],
						success: function(data) {
							clear_dialogs();
						}
					});
				}
				else {
					clear_dialogs();
				}
			});
		});
	});
	$('.download_waiting_item .download_play').unbind('click').click(function() {
		var gid = $(this).parents('.download_waiting_item').attr('data-gid');
		aria_syscall({
			func: 'unpause',
			params: [gid],
			success: function(data) {
				update_ui();
			},
			error: function(err) {
				console.log("error playing waiting download!!!");
				console.log(err);
			}
		});
	});
	$('.download_waiting_item .download_remove').unbind('click').click(function() {
		var gid = $(this).parents('.download_waiting_item').attr('data-gid');
		aria_syscall({
			func: 'remove',
			params: [gid],
			success: function() {
				update_ui();
			},
			error: function(err) {
				console.log("error removing waiting download!!!");
				console.log(err);
			}
		});
	});
}

function updateStoppedDownloads(data) {
	refreshDownloadTemplates('stopped', data);
	$('.download_stopped_item .download_remove').unbind('click').click(function() {
		var gid = $(this).parents('.download_stopped_item').attr('data-gid');
		aria_syscall({
			func: 'removeDownloadResult',
			params: [gid],
			success: function() {
				update_ui();
			},
			error: function(err) {
				console.log("error removing stopped download!!!");
				console.log(err);
			}
		});
	});
	$('.download_stopped_item .download_restart').unbind('click').click(function() {
		var gid = $(this).parents('.download_stopped_item').attr('data-gid');
		var files;
		var uris = [];
		for(var i = 0; i < d_files.stopped.length; i++) {
			if(d_files.stopped[i].gid === gid) {
				files = d_files.stopped[i].files;
				break;
			}
		}
		for(var i = 0; i < files.length; i++) {
			var tmp_uris = [];
			for(var j = 0; j < files[i].uris.length; j++) {
				tmp_uris.push(files[i].uris[j].uri);
			}
			uris.push(tmp_uris);
		}
		addDownload(uris);
		aria_syscall({
			func: 'removeDownloadResult',
			params: [gid],
			success: function() {
				update_ui();
			},
			error: function(err) {
				console.log("error removing stopped download!!!");
				console.log(err);
			}
		});
	});
}


function mergeDownloads(data) {
	d_files.active = data[0][0];
	d_files.waiting = data[1][0];
	d_files.stopped = data[2][0];
}

function updateDownloads() {
	aria_syscall({
		func: 'system.multicall',
		params:[[{
			methodName: 'aria2.tellActive'
		}, {
			methodName: 'aria2.tellWaiting',
			params: [0,100]
		}, {
			methodName: 'aria2.tellStopped',
			params: [0, 100]
		}, {
			methodName: "aria2.getGlobalStat"
		}]],
		success: function(data) {
			mergeDownloads(data.result);
			updateActiveDownloads(d_files.active);
			updateWaitingDownloads(d_files.waiting);
			updateStoppedDownloads(d_files.stopped);
			updateGlobalStatistics(data.result[3][0]);
		},
		error: function() {
			modals.err_connect.modal('show');
		}
	}, true);
}

function updateGlobalStatistics(data) {
	data.downloadSpeed = changeLength(data.downloadSpeed, "B/s");
	data.uploadSpeed = changeLength(data.uploadSpeed, "B/s");
	for(var i in data) {
		$('.stat_' + i).text(data[i]);
	}
}
function custom_global_statistics() {
	var tmpl = $('#global_statistics_template').text();
	modals.global_statistics_modal.modal('show');
}
setInterval(update_ui, 1000);