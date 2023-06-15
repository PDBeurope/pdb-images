test -d "$XVFB_DIR" || echo "docker/entrypoint.sh: Failed because specified XVFB_DIR does not exist: $XVFB_DIR" 1>&2
test -d "$XVFB_DIR" || exit 1

export TMPDIR=$XVFB_DIR  # For xvfb auth file
XVFB_ERROR=$XVFB_DIR/err-$$.txt
SERVERNUM=99$$

sh /pdbe-images/docker/xvfb-run-2.sh --server-num $SERVERNUM --auto-servernum -e $XVFB_ERROR node /pdbe-images/lib/cli/pdbe-images.js $@
STATUS=$?

test -s $XVFB_ERROR && echo "docker/entrypoint.sh: Xvfb error file not empty, see below:" 1>&2 && cat $XVFB_ERROR 1>&2
rm -f $XVFB_ERROR
exit $STATUS
