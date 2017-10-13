const fs = require('fs')
const imagemin = require('imagemin')
const imageminPngquant = require('imagemin-pngquant')

class App {

	constructor () {
		this.path = null

		this.container = document.querySelector('#container')
		this.compress = this.compress.bind(this)
		this.renderFile = this.renderFile.bind(this)
		this.renderFiles = this.renderFiles.bind(this)

		this.bindDrop()
		this.bindSelect()
		this.bindMouseEnter()
	}

	renderFile(file, originalPath) {
		let {getFilesizeInKB} = this

		let name = /[^/]*$/.exec(file.path)[0]
		let compressedSize = getFilesizeInKB(file.path)
		let size = this.toStringKB(compressedSize)
		let originalBytes = getFilesizeInKB(originalPath)
		// compressed percent
		let percent = this.toPercent(compressedSize / originalBytes)

		return `
			<div class="tr" data-path=${file.path} data-original-path=${originalPath}>
				<div class="td">${name}</div>
				<div class="td">${size}</div>
				<div class="td">${percent}</div>
			</div>
		`
	}

	renderFiles (files) {
		let {container, renderFile} = this
		let fileStrings = []

		files.forEach((file) => {
			let fileString = renderFile(file, file.path.replace('_compressed', ''))
			fileStrings.push(fileString)
		})

		container.innerHTML = fileStrings.join('')
	}

	toPercent(num){
		return ((num * 100) >> 0) + '%'
	}

	toStringKB(num){
		return num.toFixed(1) + 'KB'
	}

	getFilesizeInKB(filename) {
		const stats = fs.statSync(filename)
		const fileSizeInBytes = (stats.size / 1024)
		return fileSizeInBytes
	}

	bindDrop(){
		window.addEventListener('dragover', (e) => {
			e.preventDefault()
		},false)

		window.addEventListener('drop', (e) => {
			e.preventDefault()
			this.path = e.dataTransfer.files[0].path
			this.compress()
		},false)
	}

	bindSelect(){
		let quality = document.querySelector('#quality')

		quality.onchange = this.compress
	}

	compressPng (path, quality) {
		let {renderFiles} = this

		imagemin([path + '/*.png'], path + '_compressed', {use: [imageminPngquant({quality: quality})]}).then((files) => {
			renderFiles(files)
		})
	}

	compress () {
		let {path} = this
		let select = document.querySelector('#quality')
		let quality = '0-' + parseInt(select.options[select.selectedIndex].text)

		this.compressPng(path, quality)
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
			if(!show){
				preview.style.display = 'block'
				show = true
			}

			preview.style.edisplay = 'block'

			let target = e.target;

			while(!target.matches('.tr')){
				target = target.parentNode
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
