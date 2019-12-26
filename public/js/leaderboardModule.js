var leaderboardModule = function () {
	var init = (list) => {
		initScreen(list);
	};

	var initScreen = (list) => {
		$.ajax({
			url: `/api/report/list/${list.slug}`,
			type: 'get',
			dataType: 'json',
			success: function (data) {
				var template = $('#leaderboardTableTemplate').html();
				var templateScript = Handlebars.compile(template);
				var html = templateScript({ type: list.type.charAt(0).toUpperCase() + list.type.substring(1), reports: data.reports });
				var stats = computeStats(data.reports);

				$('.loadingList').hide();
				$('.table').html(html);
				$('.report').show();
				$.fn.dataTable.ext.classes.sPageButtonActive = 'waves-effect waves-light btn';
				$('.report table').DataTable({
					"order": [[ 1, "desc" ]]
				});
				$('select').formSelect();

				$('#count').text(stats.totalItemsPlayed.toLocaleString());
				$('#playcount').text(stats.totalPlayCount.toLocaleString());
			}
		});
	};

	var computeStats = (reports) => {
		var totalItemsPlayed = 0;
		var totalPlayCount = 0;

		reports.forEach(report => {
			totalItemsPlayed += report.itemsPlayed;
			totalPlayCount += report.playcount;
		});

		return {
			totalItemsPlayed,
			totalPlayCount,
			averageItemsPlayed: totalItemsPlayed / reports.length,
			averagePlayCount: totalPlayCount / reports.length
		}
	};

	return {
		init
	}
}