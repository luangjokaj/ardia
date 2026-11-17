#ifndef ARDIA_WIN_MAIN_H_
#define ARDIA_WIN_MAIN_H_

namespace ardia_win {

void BeforeChromeMain();

void AfterChromeMain(int exit_code);

void QuitApp();

const char* TestGateDecision();

}

#endif
