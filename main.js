/* global PDFJS, URL */

'use strict';

(function (window, undefined) {
  var Reader = function (el) {
    this.element = el;
    this.reader = Polymer.dom(el.root).querySelector('.pdf-viewer');
    this.viewportOut = this.reader.querySelector('.pdf-viewport-out');
    this.viewport = this.reader.querySelector('.pdf-viewport');
    this.toolbar = this.reader.querySelector('.pdf-toolbar');
    this.title = this.toolbar.querySelector('.title');

    this.totalPages = this.reader.querySelector('#totalPages');

    this.viewportStyle = this.viewport.style;
    this.viewportOutStyle = this.viewportOut.style;

    this.ctx = this.viewport.getContext('2d');

    this.SRC = el.src;
    this.WIDTH = el.getAttribute('width');
    this.HEIGHT = el.getAttribute('height');

    this.setSize();
    PDFJS.workerSrc = 'scripts/pdf.worker.js';
    this.loadPDF();
  };

  Reader.prototype.setSize = function (attrName, newVal) {
    var width = this.WIDTH,
      height = this.HEIGHT;

    if (attrName === 'width') {
      width = newVal;
    }

    if (attrName === 'height') {
      height = newVal;
    }

    this.element.style.width = this.reader.style.width = width + 'px';
    this.element.style.height = this.reader.style.height = height + 'px';

    this.viewportOutStyle.width = width + 'px';
    this.viewportOutStyle.height = height - 64 + 'px';
  };

  Reader.prototype.setSrc = function (src) {
    this.SRC = src;
  };
  Reader.prototype.loadPDF = function () {
    var self = this;

    PDFJS.getDocument(this.SRC).then(function (pdf) {
      self.PDF = pdf;
      self.renderPDF(1);

      self.currentPage = 1;
      self.totalPages.innerHTML = self.PDF.numPages;
      self.totalPagesNum = self.PDF.numPages;
      self.currentZoomVal = self.fitZoomVal = self.widthZoomVal = 0;
      self.createDownloadLink();
    });
  };

  Reader.prototype.renderPDF = function (pageNum, resize) {
    var self = this;

    this.PDF.getPage(pageNum).then(function (page) {
      var scaleW, scaleH, viewerViewport, scale;

      self.pageW = page.view[2];
      self.pageH = page.view[3];

      if (self.currentZoomVal === 0 || !!resize) {
        scaleW = Math.round((self.WIDTH / self.pageW) * 100) / 100,
          scaleH = Math.round(((self.HEIGHT - 64 ) / self.pageH) * 100) / 100,
          scale = Math.min(scaleH, scaleW);
        self.currentZoomVal = self.fitZoomVal = scale;
        self.widthZoomVal = self.WIDTH / self.pageW;
      }
      if (!!resize) {
        self.zoomPage({target: self.zoomLvl});
      } else {
        scale = self.currentZoomVal;

        viewerViewport = page.getViewport(scale);

        self.pageW = self.pageW * scale;
        self.pageH = self.pageH * scale;

        self.setViewportPos();

        self.viewport.width = self.pageW;
        self.viewport.height = self.pageH;
        self.viewportStyle.width = self.pageW + 'px';
        self.viewportStyle.height = self.pageH + 'px';

        self.ctx.clearRect(0, 0, self.viewport.width, self.viewport.height);
        page.render({canvasContext: self.ctx, viewport: viewerViewport});
      }
    });
  };

  Reader.prototype.setViewportPos = function () {
    this.viewportStyle.left = (this.WIDTH - this.pageW) / 2 + 'px';

    if (this.pageH < this.HEIGHT) {
      this.viewportStyle.top = (this.HEIGHT - this.pageH - 64) / 2 + 'px';
    } else {
      this.viewportStyle.top = 0;
    }
  };

  Reader.prototype.changePDFSource = function (newSrc) {
    this.setSrc(newSrc);
    this.loadPDF();
  };

  Reader.prototype.zoomIn = function(){
    var step = 0.1;
    this.currentZoomVal = Math.round((Math.round(this.currentZoomVal * 10) / 10 + step) * 10) / 10;
    this.renderPDF(this.currentPage);
  };

  Reader.prototype.zoomOut = function(){
    var step = -0.1;
    this.currentZoomVal = Math.round((Math.round(this.currentZoomVal * 10) / 10 + step) * 10) / 10;
    this.renderPDF(this.currentPage);
  };

  Reader.prototype.zoomPageFit = function(){
    this.currentZoomVal = this.fitZoomVal;
    this.renderPDF(this.currentPage);
  };

  Reader.prototype.zoomWidthFit = function(){
    this.currentZoomVal = this.widthZoomVal;
    this.renderPDF(this.currentPage);
  };

  Reader.prototype.getPageNum = function(){
    console.log('asd' + this.PDF.numPages);
    return this.PDF.numPages;
  }

  Reader.prototype.createDownloadLink = function () {
    var self = this;

    this.PDF.getData().then(function (data) {
      var blob = PDFJS.createBlob(data, 'application/pdf');

      self.downloadLink = URL.createObjectURL(blob);
    });
  };

  Reader.prototype.download = function (context) {
    var a = document.createElement('a'),
      filename = this.SRC.split('/');

    a.href = this.downloadLink;
    a.target = '_parent';

    if ('download' in a) {
      a.download = filename[filename.length - 1];
    }

    this.reader.appendChild(a);
    a.click();
    a.parentNode.removeChild(a);
  };

  window.Polymer.Reader = Reader;
})(window);
