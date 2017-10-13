const fs = require('fs')
const imagemin = require('imagemin')
const imageminPngquant = require('imagemin-pngquant')
const imageminOptipng = require('imagemin-optipng')
const imageminJpegtran = require('imagemin-jpegtran')
const imageminSvgo = require('imagemin-svgo')
const imageminGifsicle = require('imagemin-gifsicle')
const imageminMozjpeg = require('imagemin-mozjpeg')

class App {

	constructor () {
		this.plugins = {
			jpg: function (quality) {
				return [
					imageminJpegtran({progressive: true}),
					imageminMozjpeg({
						tune: 'psnr',
						quality: quality
					})
				]
			},
			png: function (quality) {
				return [
					imageminOptipng({optimizationLevel: 2}),
					imageminPngquant({quality: quality})
				]
			},
			svg: function (quality) {
				return [
					imageminSvgo({})
				]
			},
			gif: function (quality) {
				return [
					imageminGifsicle()
				]
			}
		}

		this.qualities = {
			png: +document.querySelector('#png-quality').value,
			jpg: +document.querySelector('#jpg-quality').value
		}

		this.container = document.querySelector('#container')
		this.compress = this.compress.bind(this)
		this.renderFile = this.renderFile.bind(this)
		this.renderFiles = this.renderFiles.bind(this)
		this.render = this.render.bind(this)

		this.bindDrop()
		this.bindSelect()
		this.bindMouseEnter()
	}

	renderFile(file, originalPath, format) {
		let {getFilesizeInKB} = this

		let name = /[^/]*$/.exec(file.path)[0]
		let compressedSize = getFilesizeInKB(file.path)
		let size = this.toStringKB(compressedSize)
		let originalBytes = getFilesizeInKB(originalPath, format)
		// compressed percent
		let percent = this.toPercent(compressedSize / originalBytes)

		return `
			<div class="tr tr-${format}" data-path=${file.path} data-original-path=${originalPath}>
				<div class="td">${name}</div>
				<div class="td">${format}</div>
				<div class="td">${size}</div>
				<div class="td">${percent}</div>
			</div>
		`
	}

	renderFiles (format, files) {
		let {container, renderFile} = this
		let strs = []

		files.forEach((file) => {
			let originalPath = file.path.replace('_compressed', '')
			
			let fileString = renderFile(file, originalPath, format)
			strs.push(fileString)
		})

		return strs
	}

	render (format, files) {
		let strs = this.renderFiles(format, files)
		let div = document.createElement('div')
		let domId = format + '-list'
		let dom = document.querySelector('#' + domId)
		let html = strs.join('')

		if (dom) {
			dom.innerHTML = html
		} else {
			div.innerHTML =  `
				<div id="${domId}">${html}</div>
			`
			this.container.appendChild(div)
		}

	}

	toPercent(num){
		return ((num * 100) >> 0) + '%'
	}

	toStringKB(num){
		return num.toFixed(1) + 'KB'
	}

	getFilesizeInKB(filename, format) {
		let stats = fs.statSync(filename)

		const fileSizeInBytes = (stats.size / 1024)
		return fileSizeInBytes
	}

	bindDrop(){
		window.addEventListener('dragover', (e) => {
			e.preventDefault()
		},false)

		window.addEventListener('drop', (e) => {
			e.preventDefault()
			let path = e.dataTransfer.files[0].path
			this.path = path
			this.compress()
		},false)
	}

	bindSelect(){
		let {compress, qualities} = this

		let pngQuality = document.querySelector('#png-quality')
		let jpgQuality = document.querySelector('#jpg-quality')

		pngQuality.onchange = function(){
			qualities.png = +pngQuality.value
			compress('png')
		}

		jpgQuality.onchange = function(){
			qualities.jpg = +jpgQuality.value
			compress('jpg')
		}
	}

	/**
	 * compress specified type, compress all kinds of images if type is undefined
	 */
	compress (type) {
		let {render, plugins, qualities, path} = this

		for (let format in plugins) {
			if (type && type !== format) {
				continue
			}

			imagemin([path + '/*.' + format], path + '_compressed', {
				plugins: plugins[format](qualities[format])
			}).then((files) => {
				render(format, files)
			})
		}
	}

	bindMouseEnter(){
		let {container} = this
		let previewOriginalImg = document.querySelector('#preview-original-img')
		let previewCompressedImg = document.querySelector('#preview-compressed-img')
		let preview = document.querySelector('#preview')
		let currentRow; 
		let show = false

		container.addEventListener('mouseleave', (e) => {
			show = false
			preview.style.display = 'none'
		})

		container.addEventListener('mousemove', (e) => {
			e.stopPropagation()
			if(!show){
				preview.style.display = 'block'
				show = true
			}

			preview.style.edisplay = 'block'

			let target = e.target

			while(target.matches && !target.matches('.tr')){
				target = target.parentNode
			}

			if (!target.matches) {
				return
			}
			
			if(currentRow !== target){
				currentRow = target

				previewCompressedImg.src  = target.getAttribute('data-path')
				previewOriginalImg.src = target.getAttribute('data-original-path')
			}

			preview.style.transform = 'translate(' + (e.clientX+10) + 'px,'+ (10+e.clientY) + 'px)' 
		})
	}
}

window.onload = () => {
	new App()
}
