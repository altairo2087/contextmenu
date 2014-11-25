/**
 * функция контекстного меню правой кнопкой мыши
 *
 * параметры
 * @id - идентификатор вызываемого меню
 * @options - object - необязательные параметры
 *
 * интерфейс ( свойства @options )
 * {
 *   bindings - object - функции вызываемые при нажатии на элемент
 *   {
 *     'id элемента списка': функция
 *   }
 *   menuStyle - object - стиль обертки меню <ul>
 *   {
 *     'стиль':'значение'
 *   }
 *   itemStyle - object - стиль элемента меню <li>
 *   {
 *     'стиль':'значение'
 *   }
 *   itemHoverStyle - object - стиль элемента меню при наведении
 *   {
 *     'стиль':'значение'
 *   }
 *   shadow - bool - тень меню
 *   eventPosX,eventPosY - string - задаем где появится меню
 *   onContextMenu(event) - function - функция выполнится до открытия, если вернет false - меню не откроется
 *   onShowMenu(event, menu) - function - функция выполнится перед открытием меню
 *   excluded - string - текст выборки jQuery, включает в себя дочерние элементы, которые буду игнорировать окнтекстное меню
 *   ctrlOpen - открывать меню только при нажатом ctrl
 *   showOnSelection - открывать меню при выделенном тексте
 * }
 */
(function($) {
  var menu, shadow, trigger, content, hash, currentTarget;

  // параметры по умолчанию
  var defaults = {
    menuStyle: {
      listStyle: 'none',
      padding: '0px',
      margin: '0px',
      backgroundColor: '#fff',
      border: '1px solid #999'
    },
    itemStyle: {
      color: '#000',
      display: 'block',
      cursor: 'default',
      margin: '0px',
      backgroundColor: 'transparent'
    },
    itemHoverStyle: {
      backgroundColor: '#C7C7C7'
    },
    eventPosX: 'pageX',
    eventPosY: 'pageY',
    shadow : true,
    onContextMenu: null,
    onShowMenu: null,
    excluded: false,
    ctrlOpen: false,
    showOnSelection: false
  };
  // привязываем функцию к jQuery
  $.fn.contextMenu = function(id, options) {
    // если опции не переданы, то определяем их как пустой объект
    options = options || {};
    // создаем каркас меню и прикрепляем к body
    if (!menu) {
      menu = $('<div id="jqContextMenu"></div>')
        .hide()
        .css({position:'absolute', zIndex:'500'})
        .appendTo('body')
        .on('click', function(e) {
          e.stopPropagation();
        });
    }
    // создаем тень и прикрепляем к body
    if (!shadow) {
      shadow = $('<div></div>')
        .css({backgroundColor:'#000',position:'absolute',opacity:0.2,zIndex:499})
        .appendTo('body')
        .hide();
    }
    // определяем и записываем массив, выбирая между присланными и дефолтными параметрами
    hash = hash || [];
    hash.push({
      id : id,
      menuStyle: $.extend({}, defaults.menuStyle, options.menuStyle || {}),
      itemStyle: $.extend({}, defaults.itemStyle, options.itemStyle || {}),
      itemHoverStyle: $.extend({}, defaults.itemHoverStyle, options.itemHoverStyle || {}),
      bindings: options.bindings || {},
      shadow: options.shadow || options.shadow === false ? options.shadow : defaults.shadow,
      onContextMenu: options.onContextMenu || defaults.onContextMenu,
      onShowMenu: options.onShowMenu || defaults.onShowMenu,
      eventPosX: options.eventPosX || defaults.eventPosX,
      eventPosY: options.eventPosY || defaults.eventPosY,
      excluded: options.excluded || defaults.excluded,
      ctrlOpen: options.ctrlOpen || defaults.ctrlOpen
    });
    // вешаем открытие на событие "contextmenu"
    var index = hash.length - 1;
    $(this).on('contextmenu', function(e) {
      // если включен не включен параметр showOnSelection, не открываме меню если есть что-то выделено
      if (!hash[index].showOnSelection) {
        // определяем выделение
        var selection = (window.getSelection && window.getSelection()) || (document.getSelection && document.getSelection()) || (document.selection && document.selection.createRange().text);
        if (selection.toString())
          return;
      }
      // исключаем дочерние элементы из показа контекстного меню
      if (hash[index].excluded && $(e.target).is(hash[index].excluded)) return;
      // если включен параметр, то открываем меню только по ctrl, иначе не открываем меню по ctrl
      if (hash[index].ctrlOpen && !e.ctrlKey) return;
      else if (!hash[index].ctrlOpen && e.ctrlKey) return;
      // если определена функция onContextMenu, запустим ее
      var bShowContext = (!!hash[index].onContextMenu) ? hash[index].onContextMenu(e) : true;
      if (bShowContext) display(index, this, e, options);
      return false;
    });
    return this;
  };
  // функция показа контекстного меню
  function display(index, trigger, e, options) {
    var openTime = new Date().valueOf();
    // текущие настройки
    var cur = hash[index];
    // копируем меню, применяем стили
    content = $('#'+cur.id).find('ul:first').clone(true);
    content.css(cur.menuStyle).find('li').css(cur.itemStyle).hover(
      function() {
        $(this).css(cur.itemHoverStyle);
      },
      function(){
        $(this).css(cur.itemStyle);
      }
    ).find('img').css({verticalAlign:'middle',paddingRight:'2px'});

    // вставляем получившееся на страницу (но еще не показываем)
    menu.html(content);

    // запускаем функцию onShowMenu перед показом
    if (!!cur.onShowMenu) menu = cur.onShowMenu(e, menu);

    // привязываем события к пунктам меню
    $.each(cur.bindings, function(id, func) {
      $('#'+id, menu).on('click', function(e) {
        hide();
        func(trigger, currentTarget);
      });
    });

    // теперь открываем меню
    menu.css({'left':e[cur.eventPosX],'top':e[cur.eventPosY]}).show();
    if (cur.shadow) shadow.css({width:menu.width(),height:menu.height(),left:e.pageX+2,top:e.pageY+2}).show();

    // запрещаем клик правой кнопкой на самом меню
    menu.on('contextmenu',function(event){
      event.preventDefault();
    });

    // вешаем событие закрытия меню
    $(document).on('click.contextClose scroll.contextClose contextmenu.contextClose', function(){
      var closeTime = new Date().valueOf();
      if (closeTime - openTime > 500) {
        hide();
      }
    });
  }

  // функция закрытия меню
  function hide() {
    menu.hide();
    shadow.hide();
    $(document).off(".contextClose");
  }

  // стандартные значения можно переопределить с с помощью этой функции $.contextMenu.defaults()
  $.contextMenu = {
    defaults : function(userDefaults) {
      $.each(userDefaults, function(i, val) {
        if (typeof val == 'object' && defaults[i]) {
          $.extend(defaults[i], val);
        }
        else defaults[i] = val;
      });
    }
  };

})(jQuery);
