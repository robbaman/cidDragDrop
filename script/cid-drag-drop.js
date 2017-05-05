(function(window, angular, undefined) {
	'use strict';
	var module = angular.module("cid.dragdrop", []);

	if (window['jQuery'])
		window.jQuery.event.props.push('dataTransfer');

	module.provider('cidDragDropManager', function() {
		this.$get = [function() {
			var currentData;
			return {
				setData: function(data) {
					currentData = data;
				},
				clearData: function() {
					currentData = undefined;
				},
				getData: function() {
					return currentData;
				}
			};
		}]
	})

	module.directive('cidDraggable', ['$rootScope', 'cidDragDropManager', function($rootScope, cidDragDropManager) {
		var dragElementId = 1;
		return {
			restrict: 'A',
			scope: {
				dragData: '=',
				dragImg: '='
			},
			link: function(scope, el, attrs, controller) {
				function getDragImg(scope) {
					if (scope.dragImg) {
						dragImg = {};
						var imgObj = new Image();
						if (angular.isObject(scope.dragImg)) {
							imgObj.src = scope.dragImg.src
							dragImg.img = imgObj;
							dragImg.x = scope.dragImg.x;
							dragImg.y = scope.dragImg.y;
						} else {
							imgObj.src = scope.dragImg
							dragImg.img = imgObj;
						}
						return dragImg;
					}
					return undefined;
				}
				// Mark the element as being draggable
				angular.element(el).attr("draggable", "true");

				// Ensure it has an id
				var id = angular.element(el).attr("id");
				if (!id) {
					id = 'cid-drag-element-' + (dragElementId++)
					angular.element(el).attr("id", id);
				}

				// Allow a drag image
				var dragImg;
				if (typeof DataTransfer.prototype.setDragImage === 'function') {
					dragImg = getDragImg(scope);
					scope.$watch('dragImg', function(newVal, oldVal, theScope) {
						if (newVal != oldVal)
							dragImg = getDragImg(theScope);
					});
				}

				// Bind the dragstart event
				el.bind("dragstart", function(e) {
					// Make the drag data object and JSOn
					var data = {
						id: id,
						group: attrs.cidDraggable || '',
						data: angular.copy(scope.dragData)
					};
					var json = JSON.stringify(data);
					// Set the data
					e.dataTransfer.setData('text', json)
					if (dragImg) {
						e.dataTransfer.setDragImage(dragImg.img, angular.isUndefined(dragImg.x) ? (dragImg.img.width / 2) : dragImg.x, angular.isUndefined(dragImg.y) ? (dragImg.img.height / 2) : dragImg.y)
					}
					cidDragDropManager.setData(data);
					// Register that we're dragging
					el.addClass('cid-dragging');
					$rootScope.$emit("CID-DRAG-START", data);
				});

				// And the dragend event
				el.bind("dragend", function(e) {
					// Done dragging, remove the class and the data
					$rootScope.$emit("CID-DRAG-END", cidDragDropManager.getData());
					el.removeClass('cid-dragging');
					cidDragDropManager.clearData();
				});
			}
		}
	}]);

	module.directive('cidDropTarget', ['$rootScope', 'cidDragDropManager', function($rootScope, cidDragDropManager) {
		var dropElementId = 1;
		return {
			restrict: 'A',
			scope: {
				dropEffect: '@',
				onDrop: '&',
				onEnter: '&',
				onLeave: '&'
			},
			link: function(scope, el, attrs, controller) {
				var id = angular.element(el).attr("id");
				var refCounter = 0;
				if (!id) {
					id = 'cid-drop-element-' + (dropElementId++);
					angular.element(el).attr("id", id);
				}

				el.bind("dragover", function(e) {
					var group = attrs.cidDropTarget || '';
					var data = cidDragDropManager.getData();
					if (data && group == data.group) {
						if (e.preventDefault) {
							e.preventDefault(); // Necessary. Allows us to drop.
						}

						e.dataTransfer.dropEffect = scope.dropEffect || 'move';  // See the section on the DataTransfer object.
						return false;
					}
				});

				el.bind("dragenter", function(e) {
					var data = cidDragDropManager.getData();
					var group = attrs.cidDropTarget || '';
					if (data && group == data.group) {
						refCounter++;
						el.addClass('cid-over');
						scope.$apply(function() {
							scope.onEnter({ dragId: data.id, dropId: id, dragData: data.data });
						});
					} else {
						el.addClass('cid-over-invalid');
					}
				});

				el.bind("dragleave", function(e) {
					var data = cidDragDropManager.getData();
					var group = attrs.cidDropTarget || '';
					if (data && group == data.group) {
						refCounter--;
						if (refCounter <= 0) {
							refCounter = 0;
							el.removeClass('cid-over');
							scope.$apply(function() {
								scope.onLeave({ dragId: data.id, dropId: id, dragData: data.data });
							});
						}
					} else {
						el.removeClass('cid-over-invalid');
					}
				});

				el.bind("drop", function(e) {
					if (e.preventDefault) {
						e.preventDefault(); // Necessary. Allows us to drop.
					}

					if (e.stopPropagation) {
						e.stopPropagation(); // Necessary. Allows us to drop.
					}
					var json = e.dataTransfer.getData("text");
					var data = JSON.parse(json);
					cidDragDropManager.clearData();

					refCounter = 0;
					el.removeClass('cid-over');
					el.removeClass('cid-over-invalid');

					scope.$apply(function() {
						scope.onDrop({ dragId: data.id, dropId: id, dragData: data.data });
					});
				});

				$rootScope.$on("CID-DRAG-START", function(event, data) {
					var group = attrs.cidDropTarget || '';
					if (group == data.group) {
						var el = document.getElementById(id);
						angular.element(el).addClass("cid-target");
					} else {
						var el = document.getElementById(id);
						angular.element(el).addClass("cid-target-invalid");
					}
				});

				$rootScope.$on("CID-DRAG-END", function(event, data) {
					var el = document.getElementById(id);
					angular.element(el).removeClass("cid-target-invalid");
					angular.element(el).removeClass("cid-target");
					angular.element(el).removeClass("cid-over-invalid");
					angular.element(el).removeClass("cid-over");
				});
			}
		}
	}]);
})(window, angular);