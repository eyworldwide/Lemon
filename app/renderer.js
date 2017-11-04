const fs = require('fs')
const path = require('path')
const imagemin = require('imagemin')
const imageminPngquant = require('imagemin-pngquant')
const imageminOptipng = require('imagemin-optipng')
const imageminJpegtran = require('imagemin-jpegtran')
const imageminSvgo = require('imagemin-svgo')
const imageminGifsicle = require('imagemin-gifsicle')
const imageminMozjpeg = require('imagemin-mozjpeg')
const ffmpeg = require('ffmpeg')

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
			},
			audio: null
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

	renderFile(path, originalPath, format) {
		let {getFilesizeInKB} = this

		let name = path.match(/[^/]+$/)[0]
		let compressedSize = getFilesizeInKB(path)
		let size = this.toStringKB(compressedSize)
		let originalBytes = getFilesizeInKB(originalPath, format)
		// compressed percent
		let percent = this.toPercent(compressedSize / originalBytes)

		let isAudio = (format === 'mp3' || format === 'wav')

		return `
			<div class="tr tr-${format}" data-path="${isAudio ? '' : path}" data-original-path="${isAudio ? '' : originalPath}">
				<div class="td">${name}</div>
				<div class="td">${format}</div>
				<div class="td">${size}</div>
				<div class="td">${percent}</div>
			</div>
		`
	}

	renderFiles (format, paths) {
		let {container, renderFile} = this
		let strs = []

		paths.forEach((path) => {
			let originalPath = path.replace('_compressed', '')
			
			let fileString = renderFile(path, originalPath, format)
			strs.push(fileString)
		})

		return strs
	}

	render (format, paths) {
		let strs = this.renderFiles(format, paths)
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

	compressAudios (src, dest) {
		let srcFiles = fs.readdirSync(src)

		let files = {
			mp3: [],
			wav: []
		}

		let {render} = this

		function renderAuidoList(isLast) {
			if (isLast) {
				render('mp3', files['mp3'])
				render('wav', files['wav'])
			}
		}

		function compressSingle (srcFile, destFile, suffix, isLast) {
			try {
				let process = new ffmpeg(srcFile)

				process.then((audio) => {
					// reomve audio files because the `save` API can't save force
					fs.unlinkSync(destFile)
					audio.setAudioChannels(2)
						.setAudioBitRate(64)
						.save(destFile, (error, file) => {
							if (!error) {
								console.log('Save Audio File: ' + file)
								files[suffix].push(file)
							}

							renderAuidoList(isLast)
						})
				}, (err) => {
					console.log('Compress Audio Error: ' + err)
					renderAuidoList(isLast)
				})
			} catch (e) {
				console.log('Can Not Compress Audio: ', e)
				renderAuidoList(isLast)
			}
		}

		let audioLength = 0

		function isAudio(suffix){
			return suffix === '.mp3' || suffix === '.wav'
		}

		srcFiles.forEach((item, i) => {
			let srcFile = path.join(src, item)

			if(fs.lstatSync(srcFile).isFile()){
				if(isAudio(path.extname(item))){
					audioLength++
				}
			}
		})

		srcFiles.forEach((item, i) => {
			let srcFile = path.join(src, item)
			let destFile = path.join(dest, item)
			let audioIndex = 0

			if(fs.lstatSync(srcFile).isFile()){
				let suffix = path.extname(item)

				if(isAudio(suffix)){
					compressSingle(srcFile, destFile, suffix.substring(1), !!(audioIndex === audioLength - 1))
					audioIndex++ 
				}
			}
		})

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

			if (format === 'audio') {
				this.compressAudios(path, path + '_compressed')
			} else {
				imagemin([path + '/*.' + format], path + '_compressed', {
					plugins: plugins[format](qualities[format])
				}).then((files) => {
					let paths = files.map((file) => {
						return file.path
					})

					render(format, paths)
				})
			}
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

				let path = target.getAttribute('data-path')

				if (path) {
					previewCompressedImg.src = path
					previewOriginalImg.src = target.getAttribute('data-original-path')
					preview.style.display = 'block'
				} else {
					preview.style.display = 'none'
				}
			}

			preview.style.transform = 'translate(' + (e.clientX+10) + 'px,'+ (10+e.clientY) + 'px)' 
		})
	}
}

window.onload = () => {
	new App()
}
