var listModule = function () {
	var validator;
	var regExps = {
		comma: new RegExp(',', 'g'),
		tab: new RegExp('\t', 'g'),
		semicolon: new RegExp(';', 'g'),
		newline: new RegExp('\n', 'g')
	};

	var init = () => {
		initScreen();
		initValidator();
		initEvents();
	};

	var initScreen = () => {
		$('.textOptions').hide();
		$.get('/api/list', function (response) {
			response.lists.forEach(list => {
				$('#listId').append($('<option></option>')
					.data('type', list.type)
					.data('source', list.source)
					.data('year', list.year)
					.attr('value', list.id)
					.text(list.name));
			});

			$('select').formSelect();
		});
	};

	var initValidator = () => {
		validator = $("#listForm").validate({
			rules: {
				listText: {
					required: function () {
						return $("#listId").val() === 'new';
					}
				},
				name: "required"
			},
			messages: {
				listText: "Please select a list or enter a new one",
				name: "Please enter the list name"
			},
			errorElement: 'div',
			errorPlacement: function (error, element) {
				var placement = $(element).data('error');
				if (placement) {
					$(placement).append(error)
				} else {
					error.insertAfter(element);
				}
			}
		});
	};

	var getListId = (formData, success, fail) => {
		var parsingError = false;

		if (formData.listId && formData.listId !== 'new') {
			success(formData.listId);
			return;
		}

		var items = formData.listText.split(regExps[formData.itemDelimiter]).map(entry => {
			var fields = entry.split(regExps[formData.fieldDelimiter]);
			var offset = formData.ranked === 'true' ? 0 : -1;
			var obj = {
				rank: fields[offset] || 0,
				artist: fields[offset + 1],
				name: fields[offset + 2]
			};

			if (obj.rank === undefined || obj.artist === undefined || obj.name === undefined)
				parsingError = true;

			return obj;
		});

		if (items.length > 3000) {
			fail("Don't enter lists with more than 3,000 items");
			return;
		}

		if (parsingError) {
			fail(`An error occurred while parsing the list; please make sure all items have ${formData.ranked === 'true' ? 'a rank,' : ''} an artist and a name`);
			return;
		}

		$.ajax({
			url: '/api/list',
			type: 'post',
			dataType: 'json',
			contentType: 'application/json',
			success: function (data) {
				success(data.id);
			},
			fail: function () {
				fail("An error occurred while saving the list");
			},
			data: JSON.stringify({
				items,
				name: formData.name,
				source: formData.source,
				type: formData.type,
				year: formData.year,
				public: formData.public === 'true'
			})
		});
	};

	var initEvents = () => {
		$('#analyzeBtn').off('click');
		$('#analyzeBtn').on('click', () => {
			if (!validator.form())
				return;
			
			var formData = $('#listForm')
				.serializeArray()
				.reduce(function (result, item) {
					result[item.name] = item.value;

					return result;
				}, {});

			if (!formData.listId && formData.listId !== 'new') {
				M.toast("Please select a list");
				return;
			}

			$('.loadingList').show();

			if (formData.listId !== 'new') {
				var option = $('#listId').find(':selected');

				formData.type = option.data('type');
				formData.name = option.text();
				formData.source = option.data('source');
				formData.year = option.data('year');
			}

			getListId(formData, function (listId) {
				window.location.href = `/report/${listId}/${formData.username}`;
			}, function (message) {
				$('.loadingList').hide();
				M.toast({ html: message });
			});
		});

		$(document).delegate('#listText', 'keydown', function (e) {
			var keyCode = e.keyCode || e.which;

			if (keyCode == 9) {
				e.preventDefault();
				var start = this.selectionStart;
				var end = this.selectionEnd;

				$(this).val($(this).val().substring(0, start) + "\t" + $(this).val().substring(end));

				this.selectionStart = this.selectionEnd = start + 1;
			}
		});

		$('#ranked').on('change', function () {
			if ($(this).is(":checked"))
				$('#listText').attr('placeholder', '1	Title 1	Artist 1\n2	Title 2	Artist 2\n3	Title 3	Artist 3');
			else
				$('#listText').attr('placeholder', 'Title 1	Artist 1\nTitle 2	Artist 2\nTitle 3	Artist 3');
		});

		$('input[name="fieldDelimiter"]').on('change', function () {
			if ($(this).val() === 'tab')
				$('#listText').attr('placeholder', $('#listText').attr('placeholder').replace(regExps.comma, '\t'));
			else
				$('#listText').attr('placeholder', $('#listText').attr('placeholder').replace(regExps.tab, ','));
		});

		$('input[name="itemDelimiter"]').on('change', function () {
			if ($(this).val() === 'newline')
				$('#listText').attr('placeholder', $('#listText').attr('placeholder').replace(regExps.semicolon, '\n'));
			else
				$('#listText').attr('placeholder', $('#listText').attr('placeholder').replace(regExps.newline, ';'));
		});

		$('#listId').on('change', function () {
			var list = $(this).find(':selected');

			if (list.attr('value') === 'new')
				$('.textOptions').slideDown();
			else
				$('.textOptions').slideUp();
		});
	}

	return {
		init
	}
}