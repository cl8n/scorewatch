<? if (vars.VIDEO !== '' && vars.DESCRIPTION !== null) {
    `<iframe width="100%" height="400" src="https://www.youtube.com/embed/${vars.VIDEO}?rel=0" frameborder="0" allow="autoplay; encrypted-media" allowfullscreen></iframe>`
} ?>

<? vars.SCORE_INFO ?><? if (vars.VIDEO !== '' && vars.DESCRIPTION === null) {
    `  \n<https://youtu.be/${vars.VIDEO}>`
} ?>

<? if (vars.DESCRIPTION !== null) {
    vars.DESCRIPTION
} ?>
