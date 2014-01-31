import os, os.path, shutil

YUI_COMPRESSOR = 'yuicompressor-2.4.7.jar'

def compress(in_files, out_file, in_type='js', verbose=False,
             temp_file='.temp'):
    temp = open(temp_file, 'w')
    for f in in_files:
        fh = open(f)
        data = fh.read() + '\n'
        fh.close()

        temp.write(data)

        print ' + %s' % f
    temp.close()

    options = ['-o "%s"' % out_file,
               '--type %s' % in_type]

    if verbose:
        options.append('-v')

    os.system('java -jar "%s" %s "%s"' % (YUI_COMPRESSOR,
                                          ' '.join(options),
                                          temp_file))

    org_size = os.path.getsize(temp_file)
    new_size = os.path.getsize(out_file)

    print '=> %s' % out_file
    print 'Original: %.2f kB' % (org_size / 1024.0)
    print 'Compressed: %.2f kB' % (new_size / 1024.0)
    print 'Reduction: %.1f%%' % (float(org_size - new_size) / org_size * 100)
    print ''

    #os.remove(temp_file)

SCRIPTS = [
    #'../../public/lib/jquery/jquery-1.9.1.min.js',
    #'../../public/lib/less/less.js',
    #'../../public/lib/jquery/jquery-1.8.3.min.js',
    '../../public/lib/slickgrid/lib/jquery-1.7.min.js',
    '../../public/lib/jquery/jquery.cookie.js',
    '../../public/lib/slickgrid/lib/jquery-ui-1.8.16.custom.min.js',
    '../../public/lib/slickgrid/lib/jquery.event.drag-2.2.js',
    '../../public/lib/square/jquery.validate.js',
    '../../public/lib/bootstrap/js/bootstrap.js',
    '../../public/lib/bootstrap/js/carousel.js',
    #'../../public/lib/bootstrap/js/bootstrap-datetimepicker.min.js',
    '../../public/lib/d3/d3.v2.min.js',
    '../../public/lib/d3/d3.tip.min.js',
    '../../public/lib/slickgrid/slick.core.js',
    '../../public/lib/slickgrid/slick.formatters.js',
    '../../public/lib/slickgrid/plugins/slick.cellrangedecorator.js',
    '../../public/lib/slickgrid/plugins/slick.cellrangeselector.js',
    '../../public/lib/slickgrid/plugins/slick.cellcopymanager.js',
    '../../public/lib/slickgrid/plugins/slick.cellselectionmodel.js',
    '../../public/lib/slickgrid/slick.groupitemmetadataprovider.js',
    '../../public/lib/slickgrid/controls/slick.pager.js',
    '../../public/lib/slickgrid/slick.editors.js',
    '../../public/lib/slickgrid/plugins/slick.rowselectionmodel.js',
    '../../public/lib/slickgrid/plugins/slick.checkboxselectcolumn.js',
    '../../public/lib/slickgrid/plugins/slick.autotooltips.js',
    '../../public/lib/slickgrid/slick.grid.js',
    '../../public/lib/slickgrid/slick.dataview.js',
    '../../public/lib/slickgrid/controls/slick.columnpicker.js',
    '../../public/lib/sockjs/sockjs.min.js',
    '../../public/lib/accounting/accounting.js',
    '../../public/lib/moment/moment.min.js',
    #'../../public/lib/square/crossfilter.min.js',
    #'../../public/lib/square/additional-methods.js',
    '../../public/lib/lodash/lodash-min.js',
    #'../../public/lib/alpaca/alpaca-full.min.js',
    '../../public/lib/stash/stash.min.js',
    '../../public/lib/lz/lz.js',
    '../../public/js/dDumper.js',
    #'../../public/lib/google/long.js',
    #'../../public/lib/base64/base64-arraybuffer.js',
    ]

SCRIPTS_OUT_DEBUG = '../../public/js/meshlib.js'
SCRIPTS_OUT = '../../public/js/meshlib.min.js'

GLOBAL_JS = '../../public/js/mesh.js'
GLOBAL_JS_OUT = '../../public/js/mesh.min.js'
GLOBAL_JS_OUT_DEBUG = '../../public/js/mesh.debug.js'

STYLESHEETS = [
	'../../public/lib/slickgrid/slick.grid.css',
	'../../public/lib/slickgrid/css/smoothness/jquery-ui-1.8.16.custom.css',
	'../../public/lib/slickgrid/css/slick-default-theme.css',
	'../../public/lib/slickgrid/controls/slick.pager.css',
	'../../public/lib/slickgrid/controls/slick.columnpicker.css',
	'../../public/lib/bootstrap/css/bootstrap.css',
    #'../../public/lib/bootstrap/js/bootstrap-datetimepicker.min.css',
	#'../../public/lib/bootstrap/css/bootstrap-responsive.css',
	#'../../public/lib/alpaca/alpaca.min.css',
	#'../../public/lib/alpaca/alpaca-bootstrap.min.css',
    ]
STYLESHEETS_OUT = '../../public/css/meshlib.min.css'

def main():
	print 'Compressing JavaScript...'
	compress(SCRIPTS, SCRIPTS_OUT, 'js', False, SCRIPTS_OUT_DEBUG)

	print 'Compressing JavaScript...'
	compress([GLOBAL_JS], GLOBAL_JS_OUT, 'js', False, GLOBAL_JS_OUT_DEBUG)

	print 'Compressing CSS...'
	compress(STYLESHEETS, STYLESHEETS_OUT, 'css')

if __name__ == '__main__':
    main()
