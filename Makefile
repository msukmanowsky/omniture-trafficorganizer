SRC_DIR = src
BUILD_DIR = build
TOOLS_DIR = tools

BASE_FILE = ${SRC_DIR}/TrafficOrganizer.js
BUILD_FILE = ${BUILD_DIR}/TrafficOrganizer.min.js
TEMP_FILE = ${BUILD_DIR}/Temp.min.js
CODE_HEADER = ${SRC_DIR}/Header

all : create_js_doc minify
	@@echo "Build complete.  New production file available in ${BUILD_FILE}."

create_js_doc :
	@@echo "Building JSDoc for most recent source"
	@@perl ${TOOLS_DIR}/jsdoc/jsdoc.pl --project-name "Omniture - Traffic Organizer" -d doc ${BASE_FILE}

minify :
	@@echo "Compressing JavaScript source using YUI Compressor"
	@@java -jar ${TOOLS_DIR}/yuicompressor-2.4.2.jar --preserve-semi --type js ${BASE_FILE} > ${TEMP_FILE}
	@@cat ${CODE_HEADER} ${TEMP_FILE} > ${BUILD_FILE}
	@@rm ${TEMP_FILE}