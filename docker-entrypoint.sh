XVFB_FILE=$XVFB_DIR/$$
echo "XVFB_FILE=$XVFB_FILE" 1>&2
xvfb-run --auto-servernum -f $XVFB_FILE node /pdbe-images/build/index.js $@
STATUS=$?
rm -f $XVFB_FILE
exit $STATUS
