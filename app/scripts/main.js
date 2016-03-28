 /* global PDFJS, URL */

 'use strict';

(function (window, undefined) {
  var Reader = function (el) {
    this.element = el;
    this.reader = Polymer.dom(el.root).querySelector('.pdf-viewer');
    this.viewportOut = this.reader.querySelector('.pdf-viewport-out');
    this.viewport = this.reader.querySelector('.pdf-viewport');
    this.pageNav = this.reader.querySelector('.pdf-page-nav');
    this.pageNum = this.reader.querySelector('.pdf-page-num');
    this.pageNavPN = this.pageNav.querySelectorAll('.pdf-nav');
    this.totalPages = this.pageNav.querySelector('span:last-child').children[0];
    this.zoomNav = this.reader.querySelectorAll('.pdf-scale > div');
    this.zoomLvl = this.reader.querySelector('.pdf-zoom-lvl');
    this.zoomCustom = this.zoomLvl.querySelector('.pdf-custom-zoom');
    this.zoomFit = this.zoomLvl.querySelector('.pdf-fit-zoom');

    this.viewportStyle = this.viewport.style;
    this.viewportOutStyle = this.viewportOut.style;

    this.ctx = this.viewport.getContext('2d');

    //this.SRC = el.getAttribute('src');
    this.SRC = el.src;
    this.WIDTH = el.getAttribute('width');
    this.HEIGHT = el.getAttribute('height');

    this.setEvents();
    this.setSize();
    PDFJS.workerSrc = 'scripts/pdf.worker.js';
    this.loadPDF();
  };

  Reader.prototype.setSize = function (attrName, newVal) {
    var width = this.WIDTH,
      height = this.HEIGHT;

    if (attrName === 'width')
    {
      width = newVal;
    }

    if (attrName === 'height')
    {
      height = newVal;
    }

    this.element.style.width = this.reader.style.width = width + 'px';
    this.element.style.height = this.reader.style.height = height + 'px';

    this.viewportOutStyle.width = width + 'px';
    this.viewportOutStyle.height = height - 40 + 'px';
  };

  Reader.prototype.setSrc = function (src) {
    this.SRC = src;
  };
  Reader.prototype.loadPDF = function () {
    var self = this;

    PDFJS.getDocument(this.SRC).then(function (pdf) {
      self.PDF = pdf;
      self.renderPDF(1);

      self.pageNum.value = self.currentPage = 1;
      self.totalPages.innerHTML = self.PDF.numPages;
      self.currentZoomVal = self.fitZoomVal = self.widthZoomVal = 0;
      self.zoomFit.selected = true;

      self.createDownloadLink();
    });
  };

  Reader.prototype.renderPDF = function (pageNum, resize) {
    var self = this;

    this.PDF.getPage(pageNum).then(function (page) {
      var scaleW, scaleH, viewerViewport, scale;

      self.pageW = page.view[2];
      self.pageH = page.view[3];

      if (self.currentZoomVal === 0 || !!resize)
      {
        scaleW = Math.round((self.WIDTH / self.pageW) * 100) / 100,
          scaleH = Math.round(((self.HEIGHT - 40) / self.pageH) * 100) / 100,
          scale = Math.min(scaleH, scaleW);
        self.currentZoomVal = self.fitZoomVal = scale;
        self.widthZoomVal = self.WIDTH / self.pageW;
      }
      if (!!resize)
      {
        self.zoomPage({target: self.zoomLvl});
      } else
      {
        scale = self.currentZoomVal;

        viewerViewport = page.getViewport(scale);

        self.pageW = self.pageW * scale;
        self.pageH = self.pageH * scale;

        self.setViewportPos();

        self.viewport.width = self.pageW;
        self.viewport.height = self.pageH;
        self.viewportStyle.width = self.pageW + 'px';
        self.viewportStyle.height = self.pageH + 'px';

        self.loadViewer(self.PDF.numPages);
        self.ctx.clearRect(0, 0, self.viewport.width, self.viewport.height);
        page.render({canvasContext: self.ctx, viewport: viewerViewport});
      }
    });
  };

  Reader.prototype.setViewportPos = function () {
    this.viewportStyle.left = (this.WIDTH - this.pageW) / 2 + 'px';

    if (this.pageH < this.HEIGHT)
    {
      this.viewportStyle.top = (this.HEIGHT - this.pageH - 40) / 2 + 'px';
    } else
    {
      this.viewportStyle.top = 0;
    }
  };

  Reader.prototype.loadViewer = function (numOfPages) {
    if (numOfPages === 1)
    {
      this.pageNav.classList.add('pdf-hidden');
    } else
    {
      this.pageNav.classList.remove('pdf-hidden');
    }

    this.reader.classList.add('pdf-loaded');
  };

  Reader.prototype.changePDFSource = function(newSrc){
    this.setSrc(newSrc);
    this.loadPDF();
    this.pageNavPN[0].classList.add('pdf-disabled')
    this.pageNavPN[1].classList.remove('pdf-disabled')
  }

  Reader.prototype.changePage = function (e, context) {
    var nav = e.target,
      pattern = /^[0-9]+$/,
      value;

    if (!nav.classList.contains('pdf-nav')){
      if (pattern.test(nav.value)){
        value = parseInt(nav.value);

        if (value < 1){
          context.pageNum.value = 1;
          value = 1;
        }
        if (value > context.PDF.numPages) value = context.PDF.numPages;

        nav.value = value;
        context.currentPage = value;

        (value === 1)
          ? context.pageNavPN[0].classList.add('pdf-disabled')
          : context.pageNavPN[0].classList.remove('pdf-disabled');

        (value === context.PDF.numPages)
          ? context.pageNavPN[1].classList.add('pdf-disabled')
          : context.pageNavPN[1].classList.remove('pdf-disabled');

        context.renderPDF(value);
      }else{
        context.pageNum.value = context.currentPage;
      }
    } else
    {
      if (!nav.classList.contains('pdf-disabled'))
      {
        (!!nav.classList.contains('pdf-next'))
          ? context.currentPage++
          : context.currentPage--;

        (context.currentPage === 1)
          ? context.pageNavPN[0].classList.add('pdf-disabled')
          : context.pageNavPN[0].classList.remove('pdf-disabled');

        (context.currentPage === context.PDF.numPages)
          ? context.pageNavPN[1].classList.add('pdf-disabled')
          : context.pageNavPN[1].classList.remove('pdf-disabled');

        context.pageNum.value = context.currentPage;
        context.renderPDF(context.currentPage);
      }
    }
  };

  Reader.prototype.zoomPage = function (e, context) {
    var zoom = e.target,
      step = 0.1,
      digValue;

    if (zoom.classList.contains('pdf-zoom-lvl'))
    {
      digValue = parseInt(zoom.value, 10);

      if (zoom.value === 'fit')
      {
        context.currentZoomVal = context.fitZoomVal;
      } else
      {
        if (zoom.value === 'width')
        {
          context.currentZoomVal = context.widthZoomVal;
        } else
        {
          context.currentZoomVal = digValue / 100;

          if (digValue === 200)
          {
            context.zoomNav[1].classList.add('pdf-disabled');
          }
        }
      }
      if (parseInt(zoom.value, 10) !== 200)
      {
        context.zoomNav[1].classList.remove('pdf-disabled');
      }
      context.zoomNav[0].classList.remove('pdf-disabled');

      context.renderPDF(context.currentPage);
    } else
    {
      if (zoom.classList.contains('pdf-scale-down'))
      {
        step = -0.1;
      }

      context.currentZoomVal = Math.round((Math.round(context.currentZoomVal * 10) / 10 + step) * 10) / 10;

      if (context.currentZoomVal <= 0.1)
      {
        context.currentZoomVal = 0.1;
        context.zoomNav[0].classList.add('pdf-disabled');
      } else
        if (context.currentZoomVal >= 2)
        {
          context.currentZoomVal = 2;
          context.zoomNav[1].classList.add('pdf-disabled');
        } else
        {
          context.zoomNav[0].classList.remove('pdf-disabled');
          context.zoomNav[1].classList.remove('pdf-disabled');
          context.renderPDF(context.currentPage);
        }

      context.zoomCustom.innerHTML = Math.round(context.currentZoomVal * 100) + '%';
      context.zoomFit.selected = false;
      context.zoomCustom.selected = true;
    }
  };

  Reader.prototype.createDownloadLink = function () {
    var self = this;

    this.PDF.getData().then(function (data) {
      var blob = PDFJS.createBlob(data, 'application/pdf');

      self.downloadLink = URL.createObjectURL(blob);
    });
  };

  Reader.prototype.download = function (context) {
    var a = document.createElement('a'),
      filename = context.SRC.split('/');

    a.href = this.downloadLink;
    a.target = '_parent';

    if ('download' in a)
    {
      a.download = filename[filename.length - 1];
    }

    this.reader.appendChild(a);
    a.click();
    a.parentNode.removeChild(a);
  };

  Reader.prototype.setEvents = function () {
    var self = this;

    this.reader.querySelector('.pdf-download .pdf-btn').addEventListener('click', function () {
      self.download(self);
    }, false);
    [].forEach.call(this.pageNavPN, function (el) {
      el.addEventListener('click', function (e) {
        self.changePage(e, self);
      }, false);
    });
    this.pageNum.addEventListener('input', function (e) {
      self.changePage(e, self);
    }, false);
    [].forEach.call(this.zoomNav, function (el) {
      el.addEventListener('click', function (e) {
        self.zoomPage(e, self);
      }, false);
    });
    this.zoomLvl.addEventListener('change', function (e) {
      self.zoomPage(e, self);
    }, false);
  };

  window.Polymer.Reader = Reader;
})(window);
