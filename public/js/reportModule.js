var reportModule = function () {
	var init = (listId, username) => {
		initScreen(listId, username);
		initEvents(listId, username);
	};

	var initScreen = (listId, username) => {
		$.ajax({
			url: '/api/report',
			type: 'post',
			dataType: 'json',
			contentType: 'application/json',
			success: function (data) {
				var template = $('#resultsTableTemplate').html();
				var templateScript = Handlebars.compile(template);
				var html = templateScript(data);

				$('.loadingList').hide();
				$('.table').html(html);
				$('.report').show();
				$.fn.dataTable.ext.classes.sPageButtonActive = 'waves-effect waves-light btn';
				$('.report table').DataTable();
				$('select').formSelect();

				$('#count').text(data.itemsPlayed.toLocaleString());
				$('#playcount').text(data.playcount.toLocaleString());
			},
			data: JSON.stringify({
				listId: listId,
				username: username
			})
		});
	};

	var initEvents = (listId, username) => {
		var linkClipboard = new ClipboardJS('#copyLink', {
			text: function() {
					return window.location.href;
			}
		});

		linkClipboard.on('success', function() {
			M.toast({ html: "Copied!" });
		});

		var challengeClipboard = new ClipboardJS('#createChallenge', {
			text: function() {
				$.ajax({
					url: '/api/challenge',
					type: 'post',
					dataType: 'json',
					contentType: 'application/json',
					success: function (data) {
						return `${window.location.href.substring(0, window.location.href.indexOf('/report'))}/challenge/${data.id}`;
					},
					data: JSON.stringify({
						listId,
						username
					})
				});		
			}
		});

		challengeClipboard.on('success', function() {
			M.toast({ html: "Copied!" });
		});	
	};

	return {
		init
	}
}