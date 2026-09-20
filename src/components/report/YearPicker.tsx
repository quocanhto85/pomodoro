import { Fragment } from "react";
import {
  Listbox,
  ListboxButton,
  ListboxOptions,
  ListboxOption,
  Transition
} from "@headlessui/react";
import { ChevronDown } from "lucide-react";

interface YearPickerProps {
  value: number;
  onChange: (year: number) => void;
}

/** Five years either side of today, which is as far back as the app has data. */
export function yearOptions(): number[] {
  return Array.from({ length: 10 }, (_, i) => new Date().getFullYear() - 5 + i);
}

/** Shared by the Summary and Ranking tabs so both scope to a year the same way. */
export function YearPicker({ value, onChange }: YearPickerProps) {
  return (
    <Listbox value={value} onChange={onChange}>
      <div className="relative w-[120px] sm:w-[140px]">
        <ListboxButton className="relative w-full h-[38px] sm:h-[42px] bg-white border border-gray-200 rounded-xl shadow-sm px-3 sm:px-4 py-2 text-left cursor-pointer group hover:border-rose-200 hover:bg-rose-50/30 focus:outline-none focus:ring-2 focus:ring-rose-100 transition-all duration-200">
          <span className="block truncate text-center font-medium text-gray-700 group-hover:text-rose-600 text-sm sm:text-base">
            {value}
          </span>
          <span className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-2 sm:pr-3">
            <ChevronDown
              className="h-4 w-4 text-gray-400 group-hover:text-rose-400 transition-colors duration-200"
              aria-hidden="true"
            />
          </span>
        </ListboxButton>

        <Transition
          as={Fragment}
          enter="transition ease-out duration-200"
          enterFrom="opacity-0 translate-y-2"
          enterTo="opacity-100 translate-y-0"
          leave="transition ease-in duration-150"
          leaveFrom="opacity-100 translate-y-0"
          leaveTo="opacity-0 translate-y-2"
        >
          <ListboxOptions className="report-popover absolute z-50 mt-2 w-full max-h-48 bg-white rounded-xl shadow-lg border border-gray-200/75 py-1 overflow-auto focus:outline-none">
            {yearOptions().map((year) => (
              <ListboxOption
                key={year}
                value={year}
                className={({ selected }) => `
                  relative cursor-pointer select-none py-2 px-3 sm:py-2.5 sm:px-4 mx-1 my-0.5
                  text-center font-medium rounded-lg transition-colors duration-150 text-sm sm:text-base
                  ui-active:bg-rose-50 ui-active:text-rose-600
                  ${selected
                    ? "bg-rose-50 text-rose-600"
                    : "text-gray-700 hover:bg-rose-50/50 hover:text-rose-500"
                  }
                `}
              >
                {year}
              </ListboxOption>
            ))}
          </ListboxOptions>
        </Transition>
      </div>
    </Listbox>
  );
}
