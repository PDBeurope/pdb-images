export ARGUMENTS=$@
export XVFB_FILE=$XVFB_DIR/auth-$$
XVFB_ERR=$XVFB_DIR/err-$$.txt
echo "docker-entrypoint.sh: XVFB_FILE=$XVFB_FILE" 1>&2
test -d "$XVFB_DIR" || echo "docker-entrypoint.sh: Failed because specified XVFB_DIR does not exist: $XVFB_DIR" 1>&2
touch $XVFB_FILE
# xvfb-run --server-num 99x$$ --auto-servernum -f $XVFB_FILE -e $XVFB_ERR bash -c 'echo DISPLAY=$DISPLAY 1>&2; test -e $XVFB_FILE && echo "Xvfb file exists: $XVFB_FILE" 1>&2 || echo "Xvfb file does not exist: $XVFB_FILE" 1>&2; node /pdbe-images/build/index.js $ARGUMENTS'
xvfb-run --auto-servernum -f $XVFB_FILE -e $XVFB_ERR bash -c 'echo DISPLAY=$DISPLAY 1>&2; test -e $XVFB_FILE && echo "Xvfb file exists: $XVFB_FILE" 1>&2 || echo "Xvfb file does not exist: $XVFB_FILE" 1>&2; node /pdbe-images/build/index.js $ARGUMENTS'
STATUS=$?
rm -f $XVFB_FILE || echo "docker-entrypoint.sh: Failed to remove Xvfb file $XVFB_FILE in dir $XVFB_DIR" 1>&2
test -s $XVFB_ERR && echo "docker-entrypoint.sh: There were problems with Xvfb, see error file $XVFB_ERR below:" 1>&2 && cat $XVFB_ERR 1>&2 || rm -f $XVFB_ERR  # remove if empty
exit $STATUS
