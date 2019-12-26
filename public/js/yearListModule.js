var yearListModule = function () {
	var formData = {};

	var init = () => {
		initScreen();
		initEvents();
	};

	var initScreen = () => {
		$('select').formSelect();
	};

	var initEvents = () => {
		var addRanks = (unranked) => {
			$('li').each(function() {
				var rank = $(this).find('.rank');
				var rankText = $(this).find('.rank-text');
				var index = $(this).index() + 1;
				
				rank.text(unranked ? '' : `${index}. `); 
				rankText.val(unranked ? '' : index);
			});
		};

		$('.finalList').on('click', '.down', function() {
			var parent = $(this).closest('li');

			if (parent.not(':last-child')) {
				parent.next().after(parent);
				addRanks();
			}
		});

		$('.finalList').on('click', '.up', function() {
			var parent = $(this).closest('li');

			if (parent.not(':first-child')) {
				parent.prev().before(parent);
				addRanks();
			}
		});	
		
		$('.finalList').on('click', '.delete', function() {
			var parent = $(this).closest('li');

			parent.remove();
			addRanks();
		});

		$('.finalList').on('change', '.rank-text', function() {
			var parent = $(this).closest('li');
			var targetIndex = parseInt($(this).val());

			targetIndex = targetIndex <= parent.index() ? targetIndex - 1 : targetIndex;

			if (targetIndex < $('.finalList li').length) {
				targetLi = $('.finalList').children(`:eq(${targetIndex})`);
				targetLi.before(parent);
			} else if (targetIndex === $('.finalList li').length) {
				parent.closest('ul').append(parent);
			}

			addRanks();
		});

		$('#getListensBtn').on('click', function() {
			var listItemTemplate = $('#listItemTemplate').html();
			var listItemScript = Handlebars.compile(listItemTemplate);	
			formData = $('#generateForm')
			.serializeArray()
			.reduce(function (result, item) {
				result[item.name] = item.value;

				return result;
			}, {});

			$('.loadingList').show();
			
			if (formData.type !== 'album') {
				M.toast({ html: 'Only album lists are supported at this time' });
				return;
			}
			
			$.ajax({
				url: '/api/year-list',
				type: 'post',
				dataType: 'json',
				contentType: 'application/json',
				success: function (data) {
					$('ul.finalList').empty();
					data.results.forEach(item => {
						$('ul.finalList').append(listItemScript(item));  	  
					});

					$('.finalList').sortable();
					
					$('.finalList').on('sortupdate', function() {
						addRanks();
					});

					$('#count').text(` (${data.results.length} ${formData.type}s)`);	
					addRanks();
					$('.loadingList').hide();
					$('#saveDiv').show();
				},
				error: function () {
					$('.loadingList').hide();		
					M.toast({ html: 'An error occurred while loading your list' });			
				},
				data: JSON.stringify(formData)
			});
		});

		$('#saveBtn').on('click', function() {
			var capitalize = str => {
				return str.charAt(0).toUpperCase() + str.slice(1);
			};
			var year = new Date().getFullYear();
			var items = $('.finalList li').toArray().map(li => {
				li = $(li);

				return {
					rank: parseInt($(li).find('.rank').text().trim().replace('.')),
					name: $(li).find('.title').text(),
					artist: $(li).find('.artist').text()
				};
			});

			$.ajax({
				url: '/api/list',
				type: 'post',
				dataType: 'json',
				contentType: 'application/json',
				success: function (data) {
					window.location.href = `/report/${data.id}/${formData.username}`
				},
				fail: function () {
					fail("An error occurred while saving the list");
				},
				data: JSON.stringify({
					items,
					name: `${capitalize(formData.username)}'s ${year} Year-End ${capitalize(formData.type)} List`,
					source: 'Last.fm',
					type: formData.type,
					year: new Date().getFullYear(),
					public: true
				})
			});	
		});
	};

	return {
		init
	}
}