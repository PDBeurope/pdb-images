export ARGUMENTS=$@
export XVFB_FILE=$XVFB_DIR/$$
echo "XVFB_FILE=$XVFB_FILE" 1>&2
test -d "$XVFB_DIR" || echo "Failed because specified XVFB_DIR does not exist: $XVFB_DIR" 1>&2
xvfb-run --auto-servernum -f "$XVFB_FILE" bash -c 'echo DISPLAY=$DISPLAY 1>&2; test -e $XVFB_FILE && echo "Xvfb file exists: $XVFB_FILE" 1>&2 || echo "Xvfb file does not exist: $XVFB_FILE" 1>&2; node /pdbe-images/build/index.js $ARGUMENTS'
STATUS=$?
rm -f $XVFB_FILE || echo "Failed to remove Xvfb file $XVFB_FILE in dir $XVFB_DIR" 1>&2
exit $STATUS
